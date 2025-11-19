import { Card } from "@/components/ui/card";
import type { TokenUsage } from "@/lib/tokenCost";
import { calculateTokenCost, formatCostWithRupees } from "@/lib/tokenCost";

interface StageCost {
  name: string;
  tokenUsage: TokenUsage;
}

interface CostBreakdownProps {
  costBreakdown: {
    stage1: StageCost;
    stage2: StageCost;
    stage3: StageCost;
    total: TokenUsage;
  };
  timing: {
    stage1: number;
    stage2: number;
    stage3: number;
    total: number;
  };
}

export default function CostBreakdown({ costBreakdown, timing }: CostBreakdownProps) {
  // Use flash-lite pricing for all stages
  const model = "gemini-2.5-flash-lite";

  const stage1Cost = calculateTokenCost(costBreakdown.stage1.tokenUsage, model).totalCost;
  const stage3Cost = calculateTokenCost(costBreakdown.stage3.tokenUsage, model).totalCost;
  const totalCost = calculateTokenCost(costBreakdown.total, model).totalCost;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Cost Breakdown</h3>

      <div className="space-y-3 text-xs">
        {/* Stage 1: Transcription */}
        <div className="p-2 bg-muted/30 rounded">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">{costBreakdown.stage1.name}</span>
            <span className="text-muted-foreground">{timing.stage1}ms</span>
          </div>
          <div className="text-muted-foreground space-y-0.5">
            <div className="flex justify-between">
              <span>Text input:</span>
              <span>{costBreakdown.stage1.tokenUsage.textInputTokens} tokens</span>
            </div>
            <div className="flex justify-between">
              <span>Audio input:</span>
              <span>{costBreakdown.stage1.tokenUsage.audioInputTokens} tokens</span>
            </div>
            <div className="flex justify-between">
              <span>Output:</span>
              <span>{costBreakdown.stage1.tokenUsage.outputTokens} tokens</span>
            </div>
            <div className="flex justify-between font-medium text-foreground pt-1 border-t mt-1">
              <span>Cost:</span>
              <span>{formatCostWithRupees(stage1Cost)}</span>
            </div>
          </div>
        </div>

        {/* Stage 2: Levenshtein (free) */}
        <div className="p-2 bg-muted/30 rounded">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">{costBreakdown.stage2.name}</span>
            <span className="text-muted-foreground">{timing.stage2}ms</span>
          </div>
          <div className="text-muted-foreground">
            <div className="flex justify-between font-medium text-green-600 dark:text-green-400">
              <span>Cost:</span>
              <span>FREE (local computation)</span>
            </div>
          </div>
        </div>

        {/* Stage 3: Tips (if any) */}
        {costBreakdown.stage3.tokenUsage.totalTokens > 0 && (
          <div className="p-2 bg-muted/30 rounded">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium">{costBreakdown.stage3.name}</span>
              <span className="text-muted-foreground">{timing.stage3}ms</span>
            </div>
            <div className="text-muted-foreground space-y-0.5">
              <div className="flex justify-between">
                <span>Text input:</span>
                <span>{costBreakdown.stage3.tokenUsage.textInputTokens} tokens</span>
              </div>
              <div className="flex justify-between">
                <span>Output:</span>
                <span>{costBreakdown.stage3.tokenUsage.outputTokens} tokens</span>
              </div>
              <div className="flex justify-between font-medium text-foreground pt-1 border-t mt-1">
                <span>Cost:</span>
                <span>{formatCostWithRupees(stage3Cost)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Stage 3: Skipped message */}
        {costBreakdown.stage3.tokenUsage.totalTokens === 0 && (
          <div className="p-2 bg-muted/30 rounded">
            <div className="flex justify-between items-center">
              <span className="font-medium">{costBreakdown.stage3.name}</span>
              <span className="text-green-600 dark:text-green-400 text-xs">Skipped (no problem words)</span>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="p-2 bg-primary/10 rounded border border-primary/20">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">Total</span>
            <span className="text-muted-foreground">{timing.total}ms</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Total tokens:</span>
              <span>{costBreakdown.total.totalTokens}</span>
            </div>
            <div className="flex justify-between font-semibold text-primary pt-1 border-t mt-1">
              <span>Total Cost:</span>
              <span>{formatCostWithRupees(totalCost)}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
