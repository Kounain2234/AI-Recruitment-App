import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  TrendingUp,
  Plus,
  Minus,
  Briefcase,
  GraduationCap,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [candidate, setCandidate] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) fetchCandidateDetails();
  }, [id]);

  const fetchCandidateDetails = async () => {
    const { data: candidateData, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      navigate("/candidates");
      return;
    }

    if (candidateData.job_id) {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", candidateData.job_id)
        .single();
      setJob(jobData);
    }

    setCandidate(candidateData);
    setLoading(false);
  };

  const updateStatus = async (status: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from("candidates")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: `Candidate ${status}` });
      fetchCandidateDetails();
    }
    setUpdating(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500";
    if (score >= 80) return "bg-emerald-400";
    if (score >= 70) return "bg-amber-500";
    if (score >= 60) return "bg-amber-400";
    if (score >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  const getInitials = () => {
    if (!candidate?.name) return "?";
    return candidate.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48 bg-muted rounded-xl" />
            <div className="h-48 bg-muted rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!candidate) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{candidate.name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                  {candidate.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4" />
                      {candidate.email}
                    </div>
                  )}
                  {candidate.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4" />
                      {candidate.phone}
                    </div>
                  )}
                  {candidate.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {candidate.location}
                    </div>
                  )}
                </div>
                {job && (
                  <div className="flex items-center gap-2 mt-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <Link to={`/jobs/${job.id}`} className="text-sm text-primary hover:underline">
                      {job.title}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {candidate.resume_url && (
              <Button variant="outline" asChild>
                <a href={candidate.resume_url} download>
                  <Download className="w-4 h-4 mr-2" />
                  Resume
                </a>
              </Button>
            )}
            {candidate.status !== "rejected" && (
              <Button
                variant="outline"
                onClick={() => updateStatus("rejected")}
                disabled={updating}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            )}
            {candidate.status !== "shortlisted" && candidate.status !== "scheduled" && (
              <Button
                variant="outline"
                onClick={() => updateStatus("shortlisted")}
                disabled={updating}
                className="text-success border-success/30 hover:bg-success/10"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Shortlist
              </Button>
            )}
            {candidate.status === "shortlisted" && (
              <Button onClick={() => updateStatus("scheduled")} disabled={updating}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Interview
              </Button>
            )}
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Match Score */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Match Score</p>
              <div className="flex items-end gap-3">
                <div
                  className={cn(
                    "text-4xl font-bold text-white px-4 py-2 rounded-xl",
                    getScoreColor(candidate.match_score)
                  )}
                >
                  {candidate.match_score}%
                </div>
                <span className="text-sm text-muted-foreground mb-2">
                  {candidate.match_score >= 80
                    ? "Excellent match"
                    : candidate.match_score >= 60
                    ? "Good match"
                    : "Needs review"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Predictive Score */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Predictive Score</p>
              <div className="flex items-end gap-3">
                <div className="text-4xl font-bold text-info">
                  {candidate.predictive_score}%
                </div>
                <span className="text-sm text-muted-foreground mb-2">
                  Hiring success probability
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Growth Potential */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Growth Potential</p>
              <div className="flex items-center gap-3">
                <Badge
                  className={cn(
                    "text-lg px-4 py-2",
                    candidate.growth_potential === "high" && "bg-success",
                    candidate.growth_potential === "medium" && "bg-amber-500",
                    candidate.growth_potential === "low" && "bg-muted"
                  )}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {candidate.growth_potential?.charAt(0).toUpperCase() +
                    candidate.growth_potential?.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skills Analysis */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Skills Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(candidate.skills_analysis || []).map((skill: any, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{skill.name}</span>
                    <span className="text-sm text-muted-foreground">{skill.match}%</span>
                  </div>
                  <Progress value={skill.match} className="h-2" />
                  {skill.context && (
                    <p className="text-xs text-muted-foreground mt-1">{skill.context}</p>
                  )}
                </div>
              ))}
              {(!candidate.skills_analysis || candidate.skills_analysis.length === 0) && (
                <p className="text-muted-foreground col-span-2">No skills analysis available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Experience Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Experience</span>
                  <span className="font-semibold">{candidate.total_experience || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Relevant Experience</span>
                  <span className="font-semibold">{candidate.relevant_experience || "N/A"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bias Meter */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Domain Focus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>General HR</span>
                  <span>IT Recruitment</span>
                </div>
                <Slider
                  value={[100 - (candidate.bias_score || 50)]}
                  max={100}
                  step={1}
                  disabled
                />
                <p className="text-sm text-muted-foreground text-center">
                  {candidate.bias_score || 10}% bias toward general HR
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Robust (Strengths) */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-success flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Robust
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(candidate.robust_points || []).map((point: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <Plus className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{point}</span>
                  </li>
                ))}
                {(!candidate.robust_points || candidate.robust_points.length === 0) && (
                  <p className="text-muted-foreground text-sm">No strengths identified yet</p>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Lacking (Gaps) */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-info flex items-center gap-2">
                <Minus className="w-5 h-5" />
                Lacking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(candidate.lacking_points || []).map((point: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <Minus className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{point}</span>
                  </li>
                ))}
                {(!candidate.lacking_points || candidate.lacking_points.length === 0) && (
                  <p className="text-muted-foreground text-sm">No gaps identified yet</p>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CandidateDetail;
