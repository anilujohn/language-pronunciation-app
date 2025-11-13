import { AIModel } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Zap, Gauge, Crown } from "lucide-react";

interface ModelSelectorProps {
  selectedModel: AIModel;
  onModelChange: (model: AIModel) => void;
}

const modelInfo: Record<AIModel, { name: string; description: string; icon: typeof Zap; badge?: string; warning?: string }> = {
  "gemini-2.5-flash-lite": {
    name: "Flash Lite",
    description: "Fastest & most affordable. Best for quick feedback.",
    icon: Zap,
    badge: "Experimental",
    warning: "⚠️ Note: This model may not be available yet. Please test to verify functionality."
  },
  "gemini-2.5-flash": {
    name: "Flash",
    description: "Balanced speed and accuracy. Recommended for most users.",
    icon: Gauge,
    badge: "Recommended"
  },
  "gemini-2.5-pro": {
    name: "Pro",
    description: "Most accurate and detailed analysis. Slower but thorough.",
    icon: Crown,
    badge: "Most Accurate"
  }
};

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  return (
    <Card data-testid="card-model-selector">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-lg">AI Model</CardTitle>
        <CardDescription>
          Choose which Gemini model to use for pronunciation analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedModel} onValueChange={(value) => onModelChange(value as AIModel)}>
          <div className="space-y-3">
            {(Object.keys(modelInfo) as AIModel[]).map((model) => {
              const info = modelInfo[model];
              const Icon = info.icon;
              const isSelected = selectedModel === model;
              
              return (
                <div
                  key={model}
                  className={`flex items-start space-x-3 rounded-md border p-4 transition-colors hover-elevate ${
                    isSelected ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  data-testid={`radio-model-${model}`}
                >
                  <RadioGroupItem 
                    value={model} 
                    id={model}
                    className="mt-1"
                    data-testid={`input-model-${model}`}
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={model}
                      className="flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <Icon className="h-4 w-4" />
                      {info.name}
                      {info.badge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          info.badge === "Experimental" 
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                            : "bg-primary/10 text-primary"
                        }`}>
                          {info.badge}
                        </span>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {info.description}
                    </p>
                    {info.warning && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {info.warning}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
