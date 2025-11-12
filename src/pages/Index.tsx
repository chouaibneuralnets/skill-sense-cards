import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SkillCard } from "@/components/SkillCard";
import { Loader2, Sparkles, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Skill {
  name: string;
  confidence: number;
  evidence: string;
}

interface LearningRecommendation {
  skill: string;
  course_title: string;
  course_link: string;
}

const normalizeSkill = (skillName: string): string => {
  if (!skillName) return '';
  return skillName
    .toLowerCase()
    .replace(/\(.*?\)/g, '')  // Supprime tout ce qui est entre parenthèses
    .trim();
};

const Index = () => {
  const [cvText, setCvText] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [jobText, setJobText] = useState("");
  const [jobSkills, setJobSkills] = useState<Skill[]>([]);
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [missingSkills, setMissingSkills] = useState<Skill[]>([]);
  const [activeTab, setActiveTab] = useState("step1");
  const [learningRecommendations, setLearningRecommendations] = useState<LearningRecommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [hasAnalyzedJob, setHasAnalyzedJob] = useState(false);

  const handleAnalyze = async () => {
    if (!cvText.trim()) {
      toast.error("Please paste your CV content");
      return;
    }

    setIsLoading(true);
    setSkills([]);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-cv', {
        body: { cvText }
      });

      if (error) {
        console.error('Error calling function:', error);
        toast.error("Error analyzing CV");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.skills) {
        setSkills(data.skills);
        toast.success(`${data.skills.length} skills detected!`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeJob = async () => {
    if (!jobText.trim()) {
      toast.error("Please paste the job offer content");
      return;
    }

    if (skills.length === 0) {
      toast.error("Please analyze your CV first");
      return;
    }

    setIsLoadingJob(true);
    setJobSkills([]);
    setMissingSkills([]);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-cv', {
        body: { cvText: jobText }
      });

      if (error) {
        console.error('Error calling function:', error);
        toast.error("Error analyzing job offer");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.skills) {
        setJobSkills(data.skills);
        
        // Compare les compétences avec normalisation
        const normalizedCvSkills = skills.map(s => normalizeSkill(s.name));
        const missing = data.skills.filter(
          (jobSkill: Skill) => !normalizedCvSkills.includes(normalizeSkill(jobSkill.name))
        );
        
        setMissingSkills(missing);
        setHasAnalyzedJob(true);
        toast.success(`${missing.length} missing skill${missing.length > 1 ? 's' : ''} detected!`);
        
        // Automatically get learning recommendations
        if (missing.length > 0) {
          getLearningRecommendations(missing);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred");
    } finally {
      setIsLoadingJob(false);
    }
  };

  const getLearningRecommendations = async (skills: Skill[]) => {
    setIsLoadingRecommendations(true);
    setLearningRecommendations([]);

    try {
      const { data, error } = await supabase.functions.invoke('get-learning-recommendations', {
        body: { missingSkills: skills }
      });

      if (error) {
        console.error('Error calling function:', error);
        toast.error("Error generating learning recommendations");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.recommendations) {
        setLearningRecommendations(data.recommendations);
        toast.success(`${data.recommendations.length} learning recommendation${data.recommendations.length > 1 ? 's' : ''} generated!`);
        // Automatically switch to Step 3 to show recommendations
        setActiveTab("step3");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred while generating recommendations");
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background/95">
      {/* Dashboard Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-primary via-primary-glow to-primary text-primary-foreground shadow-[0_8px_32px_-8px_hsl(215_80%_52%/0.4)] border-b border-primary-foreground/10">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-4 justify-center">
            <div className="p-3 bg-primary-foreground/10 rounded-xl backdrop-blur-sm shadow-inner">
              <Sparkles className="w-10 h-10 drop-shadow-lg" />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tight drop-shadow-sm">SkillSense</h1>
              <p className="text-primary-foreground/95 text-lg font-semibold mt-1 tracking-wide">
                AI Skill Analysis
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-12">
            <TabsTrigger value="step1" className="text-lg py-4">
              Step 1: My Skill Profile
            </TabsTrigger>
            <TabsTrigger value="step2" disabled={skills.length === 0} className="text-lg py-4">
              Step 2: Gap Analysis
            </TabsTrigger>
            <TabsTrigger value="step3" disabled={!hasAnalyzedJob || missingSkills.length === 0} className="text-lg py-4">
              Step 3: Learning Plan
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: My Skill Profile */}
          <TabsContent value="step1" className="space-y-8">
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-card rounded-3xl shadow-[0_8px_32px_-8px_hsl(220_20%_15%/0.12)] p-10 border border-border/40 backdrop-blur-sm hover:shadow-[0_12px_48px_-12px_hsl(220_20%_15%/0.18)] transition-shadow duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-accent/10 rounded-xl shadow-sm border border-accent/20">
                    <FileText className="w-7 h-7 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                      Analyze Your CV
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                      Copy-paste your CV content for in-depth analysis
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <Textarea
                    placeholder="Paste your CV content here... (experience, education, skills, projects, etc.)"
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    className="min-h-[320px] text-base leading-relaxed resize-none border-2 focus:border-primary transition-all duration-300 rounded-2xl bg-background/50 shadow-[inset_0_2px_4px_0_hsl(220_20%_15%/0.05)] focus:shadow-[inset_0_2px_8px_0_hsl(220_20%_15%/0.08)]"
                  />
                  
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAnalyze}
                      disabled={isLoading || !cvText.trim()}
                      size="lg"
                      className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-primary-foreground font-bold px-10 py-7 text-lg shadow-lg hover:shadow-[0_12px_48px_-12px_hsl(215_80%_52%/0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-2xl"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-3 h-6 w-6" />
                          Analyze My CV
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* My Skills Section (CV) */}
            {skills.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-accent/10 border border-accent/20 rounded-full mb-4">
                    <Sparkles className="w-6 h-6 text-accent" />
                    <span className="text-accent font-semibold text-lg">
                      {skills.length} skill{skills.length > 1 ? 's' : ''} detected
                    </span>
                  </div>
                  <h2 className="text-4xl font-bold text-foreground">
                    My Skills (CV)
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Here are the skills extracted from your CV with their confidence level
                  </p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {skills.map((skill, index) => (
                    <div
                      key={index}
                      className="animate-in fade-in slide-in-from-bottom-4"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <SkillCard
                        name={skill.name}
                        confidence={skill.confidence}
                        evidence={skill.evidence}
                        onDelete={() => {
                          setSkills(skills.filter((_, i) => i !== index));
                          toast.success("Skill removed");
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {!isLoading && skills.length === 0 && cvText.trim() === "" && (
              <section className="text-center py-20 animate-in fade-in duration-700">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-8 shadow-lg">
                  <FileText className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-3">
                  Ready to Start?
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
                  Paste your CV content in the field above, then click <span className="font-semibold text-primary">"Analyze My CV"</span> to discover your key skills with detailed confidence scores.
                </p>
              </section>
            )}
          </TabsContent>

          {/* Tab 2: Gap Analysis */}
          <TabsContent value="step2" className="space-y-12">
            {/* Gap Analysis Section */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-card rounded-3xl shadow-[0_8px_32px_-8px_hsl(220_20%_15%/0.12)] p-10 border border-border/40 backdrop-blur-sm hover:shadow-[0_12px_48px_-12px_hsl(220_20%_15%/0.18)] transition-shadow duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-accent/10 rounded-xl shadow-sm border border-accent/20">
                    <FileText className="w-7 h-7 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                      Skill Gap Analysis
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                      Compare your skills with a job offer
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <Textarea
                    placeholder="Paste a job offer here..."
                    value={jobText}
                    onChange={(e) => setJobText(e.target.value)}
                    className="min-h-[320px] text-base leading-relaxed resize-none border-2 focus:border-primary transition-all duration-300 rounded-2xl bg-background/50 shadow-[inset_0_2px_4px_0_hsl(220_20%_15%/0.05)] focus:shadow-[inset_0_2px_8px_0_hsl(220_20%_15%/0.08)]"
                  />
                  
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAnalyzeJob}
                      disabled={isLoadingJob || !jobText.trim()}
                      size="lg"
                      className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-primary-foreground font-bold px-10 py-7 text-lg shadow-lg hover:shadow-[0_12px_48px_-12px_hsl(215_80%_52%/0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-2xl"
                    >
                      {isLoadingJob ? (
                        <>
                          <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-3 h-6 w-6" />
                          Analyze Job Offer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Missing Skills Section */}
            {missingSkills.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-destructive/10 border border-destructive/20 rounded-full mb-4">
                    <Sparkles className="w-6 h-6 text-destructive" />
                    <span className="text-destructive font-semibold text-lg">
                      {missingSkills.length} missing skill{missingSkills.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <h2 className="text-4xl font-bold text-foreground">
                    Missing Skills for this Role
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    These skills are required in the job offer but not found in your CV
                  </p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {missingSkills.map((skill, index) => (
                    <div
                      key={index}
                      className="animate-in fade-in slide-in-from-bottom-4"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <SkillCard
                        name={skill.name}
                        confidence={skill.confidence}
                        evidence={skill.evidence}
                        onDelete={() => {
                          setMissingSkills(missingSkills.filter((_, i) => i !== index));
                          toast.success("Skill removed");
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </TabsContent>

          {/* Tab 3: Learning Plan */}
          <TabsContent value="step3" className="space-y-12">
            {/* Learning Recommendations Section */}
            {isLoadingRecommendations && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-card rounded-3xl shadow-lg p-10 border border-border/40 text-center">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground text-lg">Generating personalized learning recommendations...</p>
                </div>
              </section>
            )}

            {learningRecommendations.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-primary/10 border border-primary/20 rounded-full mb-4">
                    <Sparkles className="w-6 h-6 text-primary" />
                    <span className="text-primary font-semibold text-lg">
                      {learningRecommendations.length} learning recommendation{learningRecommendations.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <h2 className="text-4xl font-bold text-foreground">
                    Personalized Learning Plan
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Suggested online courses to bridge your skill gaps
                  </p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {learningRecommendations.map((recommendation, index) => (
                    <div
                      key={index}
                      className="animate-in fade-in slide-in-from-bottom-4 bg-gradient-to-br from-card to-card/80 rounded-2xl shadow-lg p-8 border border-border/40 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-primary/10 rounded-xl shadow-sm border border-primary/20 shrink-0">
                            <Sparkles className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-foreground mb-2">
                              {recommendation.skill}
                            </h3>
                            <p className="text-muted-foreground text-sm mb-2">
                              Recommended course:
                            </p>
                            <p className="text-foreground font-medium text-base mb-4">
                              {recommendation.course_title}
                            </p>
                          </div>
                        </div>
                        <a
                          href={recommendation.course_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-glow transition-all duration-200 text-sm font-semibold shadow-sm hover:shadow-md w-full"
                        >
                          View Course
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {!isLoadingRecommendations && learningRecommendations.length === 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 text-center py-20">
                <div className="max-w-2xl mx-auto">
                  <div className="p-4 bg-primary/10 rounded-full inline-flex mb-6">
                    <Sparkles className="w-16 h-16 text-primary" />
                  </div>
                  <h3 className="text-3xl font-bold text-foreground mb-4">
                    Your Learning Plan
                  </h3>
                  <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
                    Once you analyze a job offer in Step 2, personalized learning recommendations will appear here to help you bridge your skill gaps.
                  </p>
                </div>
              </section>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Dashboard Footer */}
      <footer className="bg-card/50 backdrop-blur-sm border-t border-border mt-24 py-10">
        <div className="container mx-auto px-6 text-center">
          <p className="text-muted-foreground text-base font-medium">
            Made by <span className="text-foreground font-semibold">Chegdati Chouaib</span>
          </p>
          <p className="text-muted-foreground/60 text-sm mt-2">
            SAP Challenge @ Hack-Nation's Global AI Hackathon
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
