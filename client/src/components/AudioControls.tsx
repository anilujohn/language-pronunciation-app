import { Button } from "@/components/ui/button";
import { Volume2, Mic, Square } from "lucide-react";

interface AudioControlsProps {
  isPlaying: boolean;
  isRecording: boolean;
  onListen: () => void;
  onRecord: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export default function AudioControls({
  isPlaying,
  isRecording,
  onListen,
  onRecord,
  onStopRecording,
  disabled = false,
}: AudioControlsProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full">
      <Button
        size="lg"
        variant="default"
        className="flex-1 min-h-14"
        onClick={onListen}
        disabled={disabled || isPlaying || isRecording}
        data-testid="button-listen"
      >
        <Volume2 className="mr-2 h-5 w-5" />
        {isPlaying ? "Playing..." : "Listen"}
      </Button>
      
      {!isRecording ? (
        <Button
          size="lg"
          variant="destructive"
          className="flex-1 min-h-14"
          onClick={onRecord}
          disabled={disabled || isPlaying}
          data-testid="button-record"
        >
          <Mic className="mr-2 h-5 w-5" />
          Record
        </Button>
      ) : (
        <Button
          size="lg"
          variant="destructive"
          className="flex-1 min-h-14 animate-pulse"
          onClick={onStopRecording}
          data-testid="button-stop-recording"
        >
          <Square className="mr-2 h-5 w-5" />
          Stop Recording
        </Button>
      )}
    </div>
  );
}
