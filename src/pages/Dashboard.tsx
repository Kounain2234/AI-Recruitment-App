import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Users,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

const Dashboard = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalCandidates: 0,
    shortlisted: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch jobs
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4);

    // Fetch candidates stats
    const { data: candidatesData } = await supabase
      .from("candidates")
      .select("status")
      .eq("user_id", user.id);

    const totalCandidates = candidatesData?.length || 0;
    const shortlisted = candidatesData?.filter(c => c.status === "shortlisted").length || 0;
    const rejected = candidatesData?.filter(c => c.status === "rejected").length || 0;

    setJobs(jobsData || []);
    setStats({
      totalJobs: jobsData?.length || 0,
      totalCandidates,
      shortlisted,
      rejected,
    });
    setLoading(false);
  };

  const statsCards = [
    {
      title: "Active Jobs",
      value: stats.totalJobs,
      icon: Briefcase,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Total Candidates",
      value: stats.totalCandidates,
      icon: Users,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      title: "Shortlisted",
      value: stats.shortlisted,
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's an overview of your hiring pipeline.
            </p>
          </div>
          <Link to="/jobs/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Job
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat) => (
            <Card key={stat.title} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Jobs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">Active Jobs</CardTitle>
            <Link to="/jobs">
              <Button variant="ghost" size="sm" className="gap-2">
                View All <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No jobs yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first job to start receiving AI-analyzed candidates.
                </p>
                <Link to="/jobs/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Job
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job) => (
                  <Link key={job.id} to={`/jobs/${job.id}`}>
                    <Card className="border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{job.title}</h3>
                            <p className="text-sm text-muted-foreground">{job.location || "Remote"}</p>
                          </div>
                          <Badge variant={job.status === "active" ? "default" : "secondary"}>
                            {job.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">0 candidates</span>
                          </div>
                          {job.work_type?.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {job.work_type[0]}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">AI-Powered Screening</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload resumes and let our AI analyze candidates against your job requirements.
                  </p>
                  <Link to="/resumes">
                    <Button variant="outline" size="sm">
                      Upload Resumes
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-accent to-accent/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-foreground/10 flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">AI JD Generator</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Generate professional job descriptions with AI in seconds.
                  </p>
                  <Link to="/jobs/new">
                    <Button variant="outline" size="sm">
                      Generate JD
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
