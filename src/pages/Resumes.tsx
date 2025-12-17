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

    // Get job details for mock analysis
    const job = jobs.find((j) => j.id === selectedJob);

    // Process each file with mock AI analysis
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
      const { error: uploadError, data: uploadData } = await supabase.storage
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
        prev.map((f) => (f.id === file.id ? { ...f, progress: 40 } : f))
      );

      // Get public URL for the resume
      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);

      // Simulate AI processing delay
      await new Promise((r) => setTimeout(r, 1000));

      // Update progress
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, progress: 70 } : f))
      );

      await new Promise((r) => setTimeout(r, 500));

      // Generate mock analysis result
      const mockResult = generateMockAnalysis(file.file.name, job?.title);

      // Insert candidate into database with resume URL
      const { error } = await supabase.from("candidates").insert({
        job_id: selectedJob,
        user_id: user.id,
        name: mockResult.name,
        email: mockResult.email,
        phone: mockResult.phone,
        location: mockResult.location,
        match_score: mockResult.matchScore,
        predictive_score: mockResult.predictiveScore,
        bias_score: mockResult.biasScore,
        robust_points: mockResult.robust,
        lacking_points: mockResult.lacking,
        skills_analysis: mockResult.skills,
        growth_potential: mockResult.growthPotential,
        total_experience: mockResult.totalExperience,
        relevant_experience: mockResult.relevantExperience,
        resume_url: urlData.publicUrl,
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
              ? { ...f, status: "completed", progress: 100, result: mockResult }
              : f
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

  const generateMockAnalysis = (filename: string, jobTitle?: string) => {
    const names = [
      "Sarah Johnson", "Michael Chen", "Emily Rodriguez", "David Kim",
      "Jessica Taylor", "James Wilson", "Amanda Brown", "Christopher Lee",
    ];
    const locations = [
      "San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA",
      "Denver, CO", "Boston, MA", "Los Angeles, CA", "Chicago, IL",
    ];

    const randomName = names[Math.floor(Math.random() * names.length)];
    const matchScore = Math.floor(Math.random() * 40) + 60; // 60-100
    const predictiveScore = Math.floor(Math.random() * 30) + 65; // 65-95

    return {
      name: randomName,
      email: `${randomName.toLowerCase().replace(" ", ".")}@email.com`,
      phone: "+1 (555) 123-4567",
      location: locations[Math.floor(Math.random() * locations.length)],
      matchScore,
      predictiveScore,
      biasScore: Math.floor(Math.random() * 20) + 5,
      skills: [
        { name: "React", match: Math.floor(Math.random() * 30) + 70 },
        { name: "TypeScript", match: Math.floor(Math.random() * 40) + 60 },
        { name: "Node.js", match: Math.floor(Math.random() * 50) + 50 },
        { name: "Python", match: Math.floor(Math.random() * 40) + 40 },
      ],
      robust: [
        `Strong experience in ${jobTitle || "software development"}`,
        "Excellent communication and teamwork skills",
        "Proven track record of delivering projects on time",
      ],
      lacking: [
        "Limited experience with cloud infrastructure",
        "Could benefit from more leadership experience",
      ],
      growthPotential: ["high", "medium", "low"][Math.floor(Math.random() * 2)] as string,
      totalExperience: `${Math.floor(Math.random() * 8) + 2} years`,
      relevantExperience: `${Math.floor(Math.random() * 5) + 1} years`,
    };
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
