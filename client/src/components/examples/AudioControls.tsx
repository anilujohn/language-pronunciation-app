import AudioControls from '../AudioControls';
import { useState } from 'react';

export default function AudioControlsExample() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const handleListen = () => {
    console.log('Listen triggered');
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 2000);
  };

  const handleRecord = () => {
    console.log('Record triggered');
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    console.log('Stop recording triggered');
    setIsRecording(false);
  };

  return (
    <AudioControls
      isPlaying={isPlaying}
      isRecording={isRecording}
      onListen={handleListen}
      onRecord={handleRecord}
      onStopRecording={handleStopRecording}
    />
  );
}
