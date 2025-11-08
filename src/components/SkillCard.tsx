import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Quote, X } from "lucide-react";

interface SkillCardProps {
  name: string;
  confidence: number;
  evidence: string;
  onDelete: () => void;
}

export const SkillCard = ({ name, confidence, evidence, onDelete }: SkillCardProps) => {
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "bg-accent text-accent-foreground";
    if (score >= 60) return "bg-primary text-primary-foreground";
    return "bg-secondary text-secondary-foreground";
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 80) return "Expert";
    if (score >= 60) return "Avancé";
    return "Intermédiaire";
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-card to-card/80 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="absolute top-2 right-2 h-8 w-8 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Supprimer cette compétence"
      >
        <X className="h-4 w-4" />
      </Button>
      <CardHeader className="pb-3 pr-12">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
            {name}
          </CardTitle>
          <Badge className={`${getConfidenceColor(confidence)} px-3 py-1 font-medium`}>
            {confidence}% - {getConfidenceLabel(confidence)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-2 mt-2 p-3 bg-muted/50 rounded-lg border-l-4 border-primary/30">
          <Quote className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            "{evidence}"
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
