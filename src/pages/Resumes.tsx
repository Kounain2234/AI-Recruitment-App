import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  file: File;
  id: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  result?: any;
  error?: string;
}

const Resumes = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    const jobId = searchParams.get("job");
    if (jobId) setSelectedJob(jobId);
  }, [searchParams]);

  const fetchJobs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("jobs")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("status", "active");

    setJobs(data || []);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: UploadedFile[] = files.map((file) => ({
      file,
      id: crypto.randomUUID(),
      status: "pending",
      progress: 0,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const newFiles: UploadedFile[] = files.map((file) => ({
      file,
      id: crypto.randomUUID(),
      status: "pending",
      progress: 0,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const analyzeResumes = async () => {
    if (!selectedJob) {
      toast({ variant: "destructive", title: "Error", description: "Please select a job first" });
      return;
    }

    if (uploadedFiles.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please upload at least one resume" });
      return;
    }

    setAnalyzing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get job details for n8n workflow
    const job = jobs.find((j) => j.id === selectedJob);

    // Process each file with n8n webhook
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];

      // Update status to processing
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: "processing", progress: 10 } : f
        )
      );

      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}_${file.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file.file);

      if (uploadError) {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "error", error: uploadError.message } : f
          )
        );
        continue;
      }

      // Update progress after upload
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, progress: 30 } : f))
      );

      // Get public URL for the resume
      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);

      // Update progress before n8n call
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, progress: 50 } : f))
      );

      try {
        // Call n8n webhook for AI analysis
        const formData = new FormData();
        formData.append("file", file.file);
        formData.append("job_id", selectedJob);
        formData.append("job_title", job?.title || "");
        formData.append("user_id", user.id);
        formData.append("resume_url", urlData.publicUrl);

        const response = await fetch("https://aiagentsworkbysk01.app.n8n.cloud/webhook/resume-screening", {
          method: "POST",
          body: formData,
        });

        // Update progress after n8n call
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, progress: 80 } : f))
        );

        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.statusText}`);
        }

        const analysisResult = await response.json();

        // Insert candidate into database with analysis result
        const { error } = await supabase.from("candidates").insert({
          job_id: selectedJob,
          user_id: user.id,
          name: analysisResult.name || file.file.name.replace(/\.[^/.]+$/, ""),
          email: analysisResult.email || null,
          phone: analysisResult.phone || null,
          location: analysisResult.location || null,
          match_score: analysisResult.matchScore || analysisResult.match_score || null,
          predictive_score: analysisResult.predictiveScore || analysisResult.predictive_score || null,
          bias_score: analysisResult.biasScore || analysisResult.bias_score || null,
          robust_points: analysisResult.robust || analysisResult.robust_points || [],
          lacking_points: analysisResult.lacking || analysisResult.lacking_points || [],
          skills_analysis: analysisResult.skills || analysisResult.skills_analysis || [],
          growth_potential: analysisResult.growthPotential || analysisResult.growth_potential || null,
          total_experience: analysisResult.totalExperience || analysisResult.total_experience || null,
          relevant_experience: analysisResult.relevantExperience || analysisResult.relevant_experience || null,
          resume_url: urlData.publicUrl,
          parsed_data: analysisResult,
          status: "new",
        });

        if (error) {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, status: "error", error: error.message } : f
            )
          );
        } else {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? { ...f, status: "completed", progress: 100, result: analysisResult }
                : f
            )
          );
        }
      } catch (webhookError: any) {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "error", error: webhookError.message || "Webhook failed" } : f
          )
        );
      }
    }

    setAnalyzing(false);
    toast({
      title: "Analysis Complete",
      description: `${uploadedFiles.length} resume(s) analyzed successfully.`,
    });
  };

  const completedCount = uploadedFiles.filter((f) => f.status === "completed").length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload Resumes</h1>
          <p className="text-muted-foreground mt-1">
            Upload resumes to analyze candidates with AI-powered screening.
          </p>
        </div>

        {/* Job Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Job</CardTitle>
            <CardDescription>
              Choose the job posting to analyze candidates against.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a job posting" />
              </SelectTrigger>
              <SelectContent>
                {jobs.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No active jobs - create one first
                  </SelectItem>
                ) : (
                  jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload Resumes
            </CardTitle>
            <CardDescription>
              Drag & drop or click to upload resume files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById("resume-upload")?.click()}
            >
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload"
              />
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                Drop resumes here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supported: PDF, DOCX, TXT (Max 5MB each)
              </p>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {uploadedFiles.length} file(s) uploaded
                  </p>
                  {completedCount > 0 && (
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      {completedCount} analyzed
                    </Badge>
                  )}
                </div>
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-lg border",
                      file.status === "completed" && "bg-success/5 border-success/20",
                      file.status === "error" && "bg-destructive/5 border-destructive/20",
                      file.status === "processing" && "bg-primary/5 border-primary/20"
                    )}
                  >
                    <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.file.size / 1024).toFixed(1)} KB
                      </p>
                      {file.status === "processing" && (
                        <Progress value={file.progress} className="h-1 mt-2" />
                      )}
                      {file.status === "completed" && file.result && (
                        <p className="text-xs text-success mt-1">
                          ✓ {file.result.name} - {file.result.matchScore}% match
                        </p>
                      )}
                      {file.status === "error" && (
                        <p className="text-xs text-destructive mt-1">{file.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      {file.status === "processing" && (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      )}
                      {file.status === "completed" && (
                        <CheckCircle className="w-5 h-5 text-success" />
                      )}
                      {file.status === "error" && (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            onClick={analyzeResumes}
            disabled={!selectedJob || uploadedFiles.length === 0 || analyzing}
            className="gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Start AI Analysis
              </>
            )}
          </Button>
        </div>

        {/* Info Card */}
        <Card className="bg-accent/50 border-0">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">How AI Analysis Works</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Extracts skills, experience, and contact information</li>
                  <li>• Matches candidate profile against job requirements</li>
                  <li>• Calculates match score with detailed reasoning</li>
                  <li>• Identifies strengths and gaps for quick evaluation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Resumes;
