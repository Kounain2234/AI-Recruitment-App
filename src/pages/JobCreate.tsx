import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Sparkles,
  X,
  Plus,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const workTypes = ["OnSite", "Hybrid", "Remote"];
const experienceLevels = [
  { value: "0-1", label: "0-1 years (Entry Level)" },
  { value: "1-3", label: "1-3 years (Junior)" },
  { value: "3-5", label: "3-5 years (Mid-Level)" },
  { value: "5-8", label: "5-8 years (Senior)" },
  { value: "8-12", label: "8-12 years (Lead/Principal)" },
  { value: "12+", label: "12+ years (Executive)" },
];

const JobCreate = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState("");
  const [mustHaveSkills, setMustHaveSkills] = useState<string[]>([]);
  const [goodToHaveSkills, setGoodToHaveSkills] = useState<string[]>([]);
  const [mustHaveInput, setMustHaveInput] = useState("");
  const [goodToHaveInput, setGoodToHaveInput] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pastedJD, setPastedJD] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    designation: "",
    location: "",
    workType: [] as string[],
    experience: "",
    mustHave: "",
    description: "",
    goodToHave: "",
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleWorkTypeToggle = (type: string) => {
    setSelectedWorkTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const addSkill = (type: "must" | "good") => {
    const input = type === "must" ? mustHaveInput : goodToHaveInput;
    const skills = input.split(",").map((s) => s.trim()).filter((s) => s);
    
    if (type === "must") {
      setMustHaveSkills((prev) => [...new Set([...prev, ...skills])]);
      setMustHaveInput("");
    } else {
      setGoodToHaveSkills((prev) => [...new Set([...prev, ...skills])]);
      setGoodToHaveInput("");
    }
  };

  const removeSkill = (type: "must" | "good", skill: string) => {
    if (type === "must") {
      setMustHaveSkills((prev) => prev.filter((s) => s !== skill));
    } else {
      setGoodToHaveSkills((prev) => prev.filter((s) => s !== skill));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const generateJD = () => {
    // Mock AI generation - in production, this would call an AI API
    const generatedDesc = `We are seeking a talented ${generateForm.designation} to join our growing team in ${generateForm.location}.

**Responsibilities:**
- Design, develop, and maintain high-quality software solutions
- Collaborate with cross-functional teams to define and implement new features
- Write clean, maintainable, and efficient code
- Participate in code reviews and contribute to team knowledge sharing
- Troubleshoot and debug applications

**Requirements:**
- ${generateForm.experience} of professional experience
- Proficiency in: ${generateForm.mustHave}
- Strong problem-solving and analytical skills
- Excellent communication and teamwork abilities

**Nice to Have:**
${generateForm.goodToHave ? `- Experience with: ${generateForm.goodToHave}` : "- Additional relevant experience is a plus"}

**What We Offer:**
- Competitive salary and benefits
- Flexible work arrangement (${generateForm.workType.join(", ") || "Flexible"})
- Professional development opportunities
- Collaborative and innovative work environment`;

    setTitle(generateForm.designation);
    setLocation(generateForm.location);
    setSelectedWorkTypes(generateForm.workType);
    setYearsExperience(generateForm.experience);
    setDescription(generatedDesc);
    setMustHaveSkills(generateForm.mustHave.split(",").map((s) => s.trim()).filter((s) => s));
    setGoodToHaveSkills(generateForm.goodToHave.split(",").map((s) => s.trim()).filter((s) => s));
    setShowGenerateModal(false);
    
    toast({ title: "JD Generated!", description: "AI has created your job description." });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "Not authenticated" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("jobs").insert({
      user_id: user.id,
      title,
      description,
      location,
      work_type: selectedWorkTypes,
      years_experience: yearsExperience,
      must_have_skills: mustHaveSkills,
      good_to_have_skills: goodToHaveSkills,
      status: "active",
    });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Job created successfully!" });
      navigate("/jobs");
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create Job</h1>
            <p className="text-muted-foreground">
              Upload a JD, paste text, or generate with AI.
            </p>
          </div>
        </div>

        {/* JD Input Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload / Paste JD */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Upload JD
              </CardTitle>
              <CardDescription>
                Upload a file or paste your job description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload */}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="jd-upload"
                />
                <label htmlFor="jd-upload" className="cursor-pointer">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium mb-1">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supported: .pdf, .docx, .txt, .png (Max 5MB)
                  </p>
                </label>
              </div>

              {uploadedFile && (
                <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setUploadedFile(null)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Paste Text */}
              <div>
                <Label>Or paste JD text</Label>
                <Textarea
                  placeholder="Paste your job description here..."
                  value={pastedJD}
                  onChange={(e) => setPastedJD(e.target.value)}
                  rows={6}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Generate */}
          <Card className="bg-gradient-to-br from-primary/5 to-accent">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Generate with AI
              </CardTitle>
              <CardDescription>
                Let AI create a professional job description
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate JD from AI
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Enter Job Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Designation *</Label>
                      <Input
                        placeholder="Eg. Frontend Developer"
                        value={generateForm.designation}
                        onChange={(e) => setGenerateForm({ ...generateForm, designation: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Location *</Label>
                      <Input
                        placeholder="Eg. San Francisco, CA"
                        value={generateForm.location}
                        onChange={(e) => setGenerateForm({ ...generateForm, location: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Work Type *</Label>
                      <div className="flex gap-4 mt-2">
                        {workTypes.map((type) => (
                          <label key={type} className="flex items-center gap-2">
                            <Checkbox
                              checked={generateForm.workType.includes(type)}
                              onCheckedChange={(checked) => {
                                setGenerateForm({
                                  ...generateForm,
                                  workType: checked
                                    ? [...generateForm.workType, type]
                                    : generateForm.workType.filter((t) => t !== type),
                                });
                              }}
                            />
                            <span className="text-sm">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Years of Experience *</Label>
                      <Select
                        value={generateForm.experience}
                        onValueChange={(v) => setGenerateForm({ ...generateForm, experience: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience" />
                        </SelectTrigger>
                        <SelectContent>
                          {experienceLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Must Have Skills *</Label>
                      <Input
                        placeholder="Eg. React, TypeScript, Node.js"
                        value={generateForm.mustHave}
                        onChange={(e) => setGenerateForm({ ...generateForm, mustHave: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Good To Have Skills</Label>
                      <Input
                        placeholder="Eg. GraphQL, Docker, AWS"
                        value={generateForm.goodToHave}
                        onChange={(e) => setGenerateForm({ ...generateForm, goodToHave: e.target.value })}
                      />
                    </div>
                    <Button onClick={generateJD} className="w-full">
                      Generate
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                <p>✓ Professional formatting</p>
                <p>✓ Inclusive language</p>
                <p>✓ Industry best practices</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Details Form */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>
              Fill in the structured requirements for candidate screening
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Job Title *</Label>
                  <Input
                    placeholder="Eg. Frontend Developer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Location *</Label>
                  <Input
                    placeholder="Eg. San Francisco, CA"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Work Type *</Label>
                  <div className="flex gap-4 mt-2">
                    {workTypes.map((type) => (
                      <label key={type} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedWorkTypes.includes(type)}
                          onCheckedChange={() => handleWorkTypeToggle(type)}
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Years of Experience *</Label>
                  <Select value={yearsExperience} onValueChange={setYearsExperience}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Must Have Skills */}
              <div>
                <Label>Must Have Skills *</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Type skills separated by comma"
                    value={mustHaveInput}
                    onChange={(e) => setMustHaveInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill("must");
                      }
                    }}
                  />
                  <Button type="button" onClick={() => addSkill("must")} variant="secondary">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {mustHaveSkills.map((skill) => (
                    <Badge key={skill} variant="default" className="gap-1">
                      {skill}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeSkill("must", skill)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Good To Have Skills */}
              <div>
                <Label>Good To Have Skills</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Type skills separated by comma"
                    value={goodToHaveInput}
                    onChange={(e) => setGoodToHaveInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill("good");
                      }
                    }}
                  />
                  <Button type="button" onClick={() => addSkill("good")} variant="secondary">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {goodToHaveSkills.map((skill) => (
                    <Badge key={skill} variant="outline" className="gap-1">
                      {skill}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeSkill("good", skill)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>Job Description</Label>
                <Textarea
                  placeholder="Enter the full job description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={10}
                  className="mt-2"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !title}>
                  {loading ? "Creating..." : "Create Job"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default JobCreate;
