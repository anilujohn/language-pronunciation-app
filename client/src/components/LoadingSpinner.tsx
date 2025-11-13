import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = "Processing..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12" data-testid="loader-processing">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-base text-muted-foreground">{message}</p>
    </div>
  );
}
