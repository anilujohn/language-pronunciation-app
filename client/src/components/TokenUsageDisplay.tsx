import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AIModel } from "@shared/schema";
import { calculateTokenCost, formatCost, formatCostWithRupees, getPricePerMillionTokens, type TokenUsage } from "@/lib/tokenCost";

interface TokenUsageDisplayProps {
  tokenUsage: TokenUsage;
  model: AIModel;
  label?: string;
}

export default function TokenUsageDisplay({ tokenUsage, model, label = "Token Usage" }: TokenUsageDisplayProps) {
  const costs = calculateTokenCost(tokenUsage, model);

  // Get pricing for display
  const textPrice = getPricePerMillionTokens(model, 'textInput');
  const audioPrice = getPricePerMillionTokens(model, 'audioInput');
  const outputPrice = getPricePerMillionTokens(model, 'output');

  return (
    <Card className="p-4 bg-muted/30">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground">{label}</h4>

        <div className="space-y-3">
          {/* Text Input Tokens */}
          {tokenUsage.textInputTokens > 0 && (
            <div className="border-b pb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Text Input Tokens</span>
                <Badge variant="outline" className="font-mono">
                  {tokenUsage.textInputTokens.toLocaleString()} tokens
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {tokenUsage.textInputTokens.toLocaleString()} × ${textPrice}/1M = {formatCost(costs.textInputCost)}
              </div>
            </div>
          )}

          {/* Audio Input Tokens */}
          {tokenUsage.audioInputTokens > 0 && (
            <div className="border-b pb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Audio Input Tokens</span>
                <Badge variant="outline" className="font-mono">
                  {tokenUsage.audioInputTokens.toLocaleString()} tokens
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {tokenUsage.audioInputTokens.toLocaleString()} × ${audioPrice}/1M = {formatCost(costs.audioInputCost)}
              </div>
            </div>
          )}

          {/* Output Tokens */}
          {tokenUsage.outputTokens > 0 && (
            <div className="border-b pb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Output Tokens</span>
                <Badge variant="outline" className="font-mono">
                  {tokenUsage.outputTokens.toLocaleString()} tokens
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {tokenUsage.outputTokens.toLocaleString()} × ${outputPrice}/1M = {formatCost(costs.outputCost)}
              </div>
            </div>
          )}

          {/* Total Cost */}
          <div className="pt-2 bg-primary/5 -mx-4 px-4 py-3 rounded-b">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold">Total Tokens</span>
              <Badge variant="secondary" className="font-mono font-semibold">
                {tokenUsage.totalTokens.toLocaleString()} tokens
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold">Total Cost</span>
              <span className="text-base font-bold text-primary">
                {formatCostWithRupees(costs.totalCost)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
