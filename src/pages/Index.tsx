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

  const handleAnalyze = async () => {
    if (!cvText.trim()) {
      toast.error("Veuillez coller le contenu de votre CV");
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
        toast.error("Erreur lors de l'analyse du CV");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.skills) {
        setSkills(data.skills);
        toast.success(`${data.skills.length} compétences détectées !`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Une erreur s'est produite");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeJob = async () => {
    if (!jobText.trim()) {
      toast.error("Veuillez coller le contenu de l'offre d'emploi");
      return;
    }

    if (skills.length === 0) {
      toast.error("Veuillez d'abord analyser votre CV");
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
        toast.error("Erreur lors de l'analyse de l'offre");
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
        toast.success(`${missing.length} compétence${missing.length > 1 ? 's' : ''} manquante${missing.length > 1 ? 's' : ''} détectée${missing.length > 1 ? 's' : ''} !`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Une erreur s'est produite");
    } finally {
      setIsLoadingJob(false);
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
                Analyse de Compétences par IA
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-12">
            <TabsTrigger value="step1" className="text-lg py-4">
              Étape 1 : Mon Profil de Compétences
            </TabsTrigger>
            <TabsTrigger value="step2" disabled={skills.length === 0} className="text-lg py-4">
              Étape 2 : Analyse des Écarts
            </TabsTrigger>
          </TabsList>

          {/* Onglet 1 : Mon Profil de Compétences */}
          <TabsContent value="step1" className="space-y-8">
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-card rounded-3xl shadow-[0_8px_32px_-8px_hsl(220_20%_15%/0.12)] p-10 border border-border/40 backdrop-blur-sm hover:shadow-[0_12px_48px_-12px_hsl(220_20%_15%/0.18)] transition-shadow duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-accent/10 rounded-xl shadow-sm border border-accent/20">
                    <FileText className="w-7 h-7 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                      Analysez Votre CV
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                      Copiez-collez le contenu de votre CV pour une analyse approfondie
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <Textarea
                    placeholder="Collez le contenu de votre CV ici... (expériences, formations, compétences, projets, etc.)"
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
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-3 h-6 w-6" />
                          Analyser mon CV
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Section Mes Compétences (CV) */}
            {skills.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-accent/10 border border-accent/20 rounded-full mb-4">
                    <Sparkles className="w-6 h-6 text-accent" />
                    <span className="text-accent font-semibold text-lg">
                      {skills.length} compétence{skills.length > 1 ? 's' : ''} détectée{skills.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <h2 className="text-4xl font-bold text-foreground">
                    Mes Compétences (CV)
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Voici les compétences extraites de votre CV avec leur niveau de confiance
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
                          toast.success("Compétence supprimée");
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
                  Prêt à Commencer ?
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
                  Collez le contenu de votre CV dans le champ ci-dessus, puis cliquez sur <span className="font-semibold text-primary">"Analyser mon CV"</span> pour découvrir vos compétences principales avec des scores de confiance détaillés.
                </p>
              </section>
            )}
          </TabsContent>

          {/* Onglet 2 : Analyse des Écarts */}
          <TabsContent value="step2" className="space-y-12">
            {/* Section Analyse des Écarts */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-card rounded-3xl shadow-[0_8px_32px_-8px_hsl(220_20%_15%/0.12)] p-10 border border-border/40 backdrop-blur-sm hover:shadow-[0_12px_48px_-12px_hsl(220_20%_15%/0.18)] transition-shadow duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-accent/10 rounded-xl shadow-sm border border-accent/20">
                    <FileText className="w-7 h-7 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                      Analyse des Écarts de Compétences
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                      Comparez vos compétences avec une offre d'emploi
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <Textarea
                    placeholder="Collez une offre d'emploi ici..."
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
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-3 h-6 w-6" />
                          Analyser l'offre
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Section Compétences Manquantes */}
            {missingSkills.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-destructive/10 border border-destructive/20 rounded-full mb-4">
                    <Sparkles className="w-6 h-6 text-destructive" />
                    <span className="text-destructive font-semibold text-lg">
                      {missingSkills.length} compétence{missingSkills.length > 1 ? 's' : ''} manquante{missingSkills.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <h2 className="text-4xl font-bold text-foreground">
                    Compétences Manquantes pour ce Poste
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Ces compétences sont demandées dans l'offre mais absentes de votre CV
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
                          toast.success("Compétence supprimée");
                        }}
                      />
                    </div>
                  ))}
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
            Réalisé par <span className="text-foreground font-semibold">Chegdati Chouaib</span>
          </p>
          <p className="text-muted-foreground/60 text-sm mt-2">
            Propulsé par l'Intelligence Artificielle • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
