import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  CheckCircle,
  XCircle,
  Calendar,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CandidateCardProps {
  candidate: any;
  onUpdate: () => void;
}

const CandidateCard = ({ candidate, onUpdate }: CandidateCardProps) => {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from("candidates")
      .update({ status })
      .eq("id", candidate.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: `Candidate ${status}` });
      onUpdate();
    }
    setUpdating(false);
  };

  const deleteCandidate = async () => {
    setDeleting(true);
    const { error } = await supabase
      .from("candidates")
      .delete()
      .eq("id", candidate.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Candidate removed successfully" });
      onUpdate();
    }
    setDeleting(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500";
    if (score >= 80) return "bg-emerald-400";
    if (score >= 70) return "bg-amber-500";
    if (score >= 60) return "bg-amber-400";
    if (score >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Strong";
    if (score >= 70) return "Good";
    if (score >= 60) return "Moderate";
    if (score >= 50) return "Weak";
    return "Poor";
  };

  const getInitials = () => {
    return candidate.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const statusColors: Record<string, string> = {
    new: "bg-info/10 text-info",
    reviewed: "bg-amber-100 text-amber-700",
    shortlisted: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
    scheduled: "bg-primary/10 text-primary",
  };

  return (
    <Card className="border hover:border-primary/30 hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar & Basic Info */}
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link to={`/candidates/${candidate.id}`}>
                    <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                      {candidate.name}
                    </h3>
                  </Link>
                  <Badge className={cn("text-xs font-normal", statusColors[candidate.status])}>
                    {candidate.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {candidate.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {candidate.email}
                    </div>
                  )}
                  {candidate.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {candidate.location}
                    </div>
                  )}
                </div>
              </div>

              {/* Scores */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div
                    className={cn(
                      "text-2xl font-bold text-white px-3 py-1 rounded-lg",
                      getScoreColor(candidate.match_score)
                    )}
                  >
                    {candidate.match_score}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Match</p>
                </div>
                {candidate.predictive_score > 0 && (
                  <div className="text-center">
                    <div className="text-lg font-semibold text-info">
                      {candidate.predictive_score}%
                    </div>
                    <p className="text-xs text-muted-foreground">Predictive</p>
                  </div>
                )}
              </div>
            </div>

            {/* Skills Preview */}
            {candidate.skills_analysis && candidate.skills_analysis.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {candidate.skills_analysis.slice(0, 4).map((skill: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{skill.name}</span>
                    <Progress value={skill.match} className="w-12 h-1.5" />
                    <span className="font-medium">{skill.match}%</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                {candidate.growth_potential && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs gap-1",
                      candidate.growth_potential === "high" && "border-success text-success",
                      candidate.growth_potential === "medium" && "border-amber-500 text-amber-600",
                      candidate.growth_potential === "low" && "border-muted-foreground"
                    )}
                  >
                    <TrendingUp className="w-3 h-3" />
                    {candidate.growth_potential} growth
                  </Badge>
                )}
                {candidate.total_experience && (
                  <span className="text-xs text-muted-foreground">
                    {candidate.total_experience} exp
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={deleting}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove candidate?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {candidate.name} from your candidates list. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={deleteCandidate}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {candidate.status !== "rejected" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => updateStatus("rejected")}
                    disabled={updating}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                )}
                {candidate.status !== "shortlisted" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-success hover:text-success"
                    onClick={() => updateStatus("shortlisted")}
                    disabled={updating}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Shortlist
                  </Button>
                )}
                {candidate.status === "shortlisted" && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus("scheduled")}
                    disabled={updating}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Schedule
                  </Button>
                )}
                <Link to={`/candidates/${candidate.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CandidateCard;
