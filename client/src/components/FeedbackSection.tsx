import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, GraduationCap } from "lucide-react";

interface FeedbackSectionProps {
  simpleTips: string[];
  detailedFeedback: string[];
}

export default function FeedbackSection({ simpleTips, detailedFeedback }: FeedbackSectionProps) {
  if (simpleTips.length === 0 && detailedFeedback.length === 0) return null;

  return (
    <Card className="p-6" data-testid="card-feedback">
      <Tabs defaultValue="simple" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" data-testid="text-feedback-title">
            Pronunciation Coaching
          </h3>
          <TabsList data-testid="tabs-feedback-type">
            <TabsTrigger value="simple" data-testid="tab-simple-tips">
              <Lightbulb className="h-4 w-4 mr-1.5" />
              Simple Tips
            </TabsTrigger>
            <TabsTrigger value="detailed" data-testid="tab-detailed-feedback">
              <GraduationCap className="h-4 w-4 mr-1.5" />
              Detailed Analysis
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="simple" data-testid="content-simple-tips">
          {simpleTips.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-3">
                Easy-to-follow tips using everyday language and examples
              </p>
              <ul className="space-y-3">
                {simpleTips.map((tip, index) => (
                  <li 
                    key={index} 
                    className="text-base leading-relaxed text-foreground flex gap-3"
                    data-testid={`text-simple-tip-${index}`}
                  >
                    <span className="text-primary font-semibold flex-shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No simple tips available
            </p>
          )}
        </TabsContent>

        <TabsContent value="detailed" data-testid="content-detailed-feedback">
          {detailedFeedback.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-3">
                Technical linguistic analysis for advanced learners
              </p>
              <ul className="space-y-3">
                {detailedFeedback.map((tip, index) => (
                  <li 
                    key={index} 
                    className="text-base leading-relaxed text-foreground flex gap-3"
                    data-testid={`text-detailed-feedback-${index}`}
                  >
                    <span className="text-primary font-semibold flex-shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No detailed feedback available
            </p>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
