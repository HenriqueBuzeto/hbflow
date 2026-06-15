import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, FileText, Loader2, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface AudioPlayerProps {
  src: string;
  messageId: string;
  conversationId: string;
  initialBody: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  messageId,
  conversationId,
  initialBody
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // Transcription states
  const [isTranscribing, setIsTranscribing] = useState(false);
  const isPlaceholder = initialBody === '[Áudio]' || !initialBody;
  const [transcriptionText, setTranscriptionText] = useState(isPlaceholder ? '' : initialBody);
  const updateMessageBody = useStore((state) => state.updateMessageBody);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Sync transcription state with prop if changed externally
  useEffect(() => {
    if (initialBody && initialBody !== '[Áudio]') {
      setTranscriptionText(initialBody);
    }
  }, [initialBody]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error("Playback error:", err));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = parseFloat(e.target.value);
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleSpeed = () => {
    setPlaybackRate((prev) => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2;
      return 1;
    });
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTranscribe = async () => {
    if (isTranscribing) return;
    setIsTranscribing(true);
    try {
      const response = await fetch(`/api/messages/${messageId}/transcribe`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          setTranscriptionText(data.text);
          // Sync with global Zustand store
          updateMessageBody(conversationId, messageId, data.text);
        }
      } else {
        console.error('Falha ao obter transcrição');
      }
    } catch (err) {
      console.error('Erro na requisição de transcrição:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner min-w-[280px] max-w-sm my-1.5">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Main player controls block */}
      <div className="flex items-center gap-2.5">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center shrink-0 shadow-md hover:scale-105 active:scale-95 transition-all"
        >
          {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} className="ml-0.5" fill="currentColor" />}
        </button>

        {/* Timeline Slider & Time indicators */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-mono font-medium">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume Mute Toggle */}
        <button
          onClick={toggleMute}
          className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1"
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>

        {/* Playback Speed selector */}
        <button
          onClick={toggleSpeed}
          className="bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold px-2 py-1 rounded-full transition-all shrink-0 select-none shadow-sm"
        >
          {playbackRate}x
        </button>
      </div>

      {/* Transcription area */}
      <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-2">
        {transcriptionText ? (
          <div className="flex flex-col gap-1 bg-white/70 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200/40 shadow-sm">
            <span className="text-[8.5px] font-extrabold text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <FileText size={10} />
              Transcrição por IA
            </span>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 italic whitespace-pre-wrap leading-relaxed">
              "{transcriptionText}"
            </p>
          </div>
        ) : (
          <button
            onClick={handleTranscribe}
            disabled={isTranscribing}
            className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 p-2 rounded-xl text-[10px] font-bold shadow-sm transition-all active:scale-[0.99] disabled:opacity-75"
          >
            {isTranscribing ? (
              <>
                <Loader2 size={11} className="animate-spin text-primary" />
                <span>Transcrevendo áudio...</span>
              </>
            ) : (
              <>
                <FileText size={11} className="text-primary" />
                <span>Transcrever áudio 🎙️</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
