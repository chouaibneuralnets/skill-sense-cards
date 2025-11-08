import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SkillCard } from "@/components/SkillCard";
import { Loader2, Sparkles, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Skill {
  name: string;
  confidence: number;
  evidence: string;
}

const Index = () => {
  const [cvText, setCvText] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground py-8 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 justify-center">
            <Sparkles className="w-8 h-8" />
            <h1 className="text-4xl font-bold tracking-tight">SkillSense</h1>
          </div>
          <p className="text-center mt-2 text-primary-foreground/90 text-lg">
            Analysez votre CV avec l'intelligence artificielle
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-7xl">
        {/* CV Input Section */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-card rounded-2xl shadow-lg p-8 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">
                Collez votre CV
              </h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Copiez et collez le contenu de votre CV dans le champ ci-dessous pour une analyse détaillée de vos compétences.
            </p>
            <Textarea
              placeholder="Collez le contenu de votre CV ici... (expériences, formations, compétences, etc.)"
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              className="min-h-[300px] text-base leading-relaxed resize-none border-2 focus:border-primary transition-colors"
            />
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleAnalyze}
                disabled={isLoading || !cvText.trim()}
                size="lg"
                className="bg-primary hover:bg-primary-glow text-primary-foreground font-semibold px-8 py-6 text-lg shadow-md hover:shadow-xl transition-all duration-300"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Analyser mon CV
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {skills.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
              🎯 Vos compétences détectées
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {skills.map((skill, index) => (
                <div
                  key={index}
                  className="animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 100}ms` }}
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
          </div>
        )}

        {/* Empty State */}
        {!isLoading && skills.length === 0 && cvText.trim() === "" && (
          <div className="text-center py-16 animate-in fade-in duration-700">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              Commencez votre analyse
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Collez le contenu de votre CV ci-dessus et cliquez sur "Analyser mon CV" pour découvrir vos compétences principales avec des scores de confiance.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="text-sm">
            Propulsé par l'intelligence artificielle • SkillSense {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
