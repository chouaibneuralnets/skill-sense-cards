import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkillCard } from "@/components/SkillCard";
import { Loader2, Sparkles, FileText, Upload } from "lucide-react";
import { toast } from "sonner";

interface Skill {
  name: string;
  confidence: number;
  evidence: string;
}

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!validTypes.includes(file.type)) {
        toast.error("Format de fichier non supporté. Utilisez PDF, DOCX ou TXT.");
        return;
      }
      setSelectedFile(file);
      toast.success(`Fichier sélectionné : ${file.name}`);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    setIsLoading(true);
    setSkills([]);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-cv`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

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
      toast.error("Une erreur s'est produite lors de l'analyse");
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
              <Upload className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">
                Importez votre CV
              </h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Sélectionnez votre fichier CV (PDF, DOCX ou TXT) pour une analyse détaillée de vos compétences.
            </p>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
              <Input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="max-w-md mx-auto cursor-pointer"
              />
              {selectedFile && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Fichier sélectionné : <span className="font-semibold text-foreground">{selectedFile.name}</span>
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleAnalyze}
                disabled={isLoading || !selectedFile}
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
                    Analyser le Fichier
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
        {!isLoading && skills.length === 0 && !selectedFile && (
          <div className="text-center py-16 animate-in fade-in duration-700">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              Commencez votre analyse
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Importez votre fichier CV (PDF, DOCX ou TXT) ci-dessus et cliquez sur "Analyser le Fichier" pour découvrir vos compétences principales avec des scores de confiance.
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
