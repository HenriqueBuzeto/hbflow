'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore, Conversation } from '@/store/useStore';
import { AudioPlayer } from '@/components/AudioPlayer';
import {
  Search,
  Tag as TagIcon,
  Clock,
  UserCheck,
  Building,
  CheckCircle2,
  Share2,
  FolderPlus,
  Calendar,
  Send,
  User,
  Paperclip,
  Smile,
  FileText,
  Bookmark,
  ChevronDown,
  X,
  Plus,
  CheckSquare,
  MessageSquare,
  AlertTriangle,
  Play,
  Pause,
  Activity,
  Layers,
  ArrowRight,
  UserPlus,
  Mic,
  Trash2,
  Star
} from 'lucide-react';

const formatMessageTime = (dateInput: string | Date) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const msgDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  if (msgDateOnly.getTime() === today.getTime()) {
    return `Hoje ${timeStr}`;
  }
  
  if (msgDateOnly.getTime() === yesterday.getTime()) {
    return `Ontem ${timeStr}`;
  }
  
  const diffDays = Math.round((today.getTime() - msgDateOnly.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays > 0 && diffDays < 7) {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return `${days[date.getDay()]} ${timeStr}`;
  }
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  if (date.getFullYear() === now.getFullYear()) {
    return `${day}/${month} ${timeStr}`;
  }
  return `${day}/${month}/${date.getFullYear()} ${timeStr}`;
};

const PREDEFINED_STICKERS = [
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f44d.svg', // Thumbs up
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/2764.svg',  // Heart
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f602.svg', // Joy laugh
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f44f.svg', // Clapping hands
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f389.svg', // Party popper
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f525.svg', // Fire
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f92f.svg', // Mindblown
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f680.svg', // Rocket
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/2728.svg',  // Sparkles
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/2705.svg',  // Check mark
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f60e.svg', // Sunglasses smile
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f609.svg', // Wink
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f622.svg', // Cry face
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f621.svg', // Angry face
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f917.svg', // Hug face
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f92a.svg'  // Zany face
];

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys & Emoções',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🤫', '🤥', '😶', '😶‍🌫️', '😐', '😑', '😬', '🫨', '🫠', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾']
  },
  {
    name: 'Gestos & Pessoas',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸']
  },
  {
    name: 'Animais & Natureza',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦡', '🦫', '🦦', '🦥', '🐿️', '🦔', '🐾', '🐉', '🐲', '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🐚', '🪨']
  },
  {
    name: 'Comida & Bebida',
    emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', 'バター', '🥞', ' waffle', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🌮', '🌯', '🥗', '🥘', '🥣', '🍲', '🍛', '🍜', '🍝', '🍣', '🍤', '🍿', ' dumpling', ' Bento', '🍱', '🍘', '🍙', '🍚', 'アイス', '🍧', '🍨', '🍩', '🍪', '🎂', 'ケーキ', 'カップケーキ', 'パイ', '🍫', 'キャンディ', '🍭', 'プリン', '🍯', '🍼', '🥛', '☕', 'ティーポット', '🍵', '酒', 'シャンパン', 'ワイン', 'カクテル', 'トロピカル', 'ビール', 'ジョッキ', 'カンパイ', '炭酸', 'タピオカ', 'ジュース', 'マテ', '氷']
  },
  {
    name: 'Atividades & Viagens',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '', ' badminton', ' hockey', '🎯', '🎮', '🕹️', '🎰', '🎲', '🧩', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎸', '🎻', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', ' ट्रैक्टर', '🛵', '🏍️', '🚲', '🛴', '🛹', '🛼', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛳️', '⛴️', '🚢', '✈️', '🛫', '🛬', '🪂', '🚟', '🚠', '🚡', '🚂', '🚊', '🚝', '🚞', '🚋', '🚃', '🚄', '🚅', '🚈', '🚇']
  },
  {
    name: 'Objetos & Símbolos',
    emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏰', '⏳', '⌛', '💡', '🔦', '🏮', '🔌', '🔋', '💸', '💵', '💳', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '🏷️', '🛎️', '🔑', '🗝️', '🔨', '🛠️', '⚙️', '🔫', '💣', '🧨', '🛡️', '🚬', '⚰️', '⚱️', '🧿', '🔮', '💈', '🔭', '🔬', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🧯', '🛒', '🧼', '🪥', '🧽', '🪣', '🧹', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💬', '💭', '🗯️', '📢', '📣', '🔔', '🔕', '🎵', '🎶', '➕', '➖', '✖️', '➗', '⚠️', '⛔', '🚫', '🔞', '☢️']
  }
];

const convertUrlToBase64 = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Error converting URL to base64:', err);
    return url;
  }
};

function EmojiStickerPicker({
  onSelectEmoji,
  onSelectSticker,
  favoriteStickers,
  onClose
}: {
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (stickerUrl: string) => void;
  favoriteStickers: string[];
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'emoji' | 'sticker'>('emoji');
  const [activeStickerSubTab, setActiveStickerSubTab] = useState<'default' | 'favorites'>('default');
  const [search, setSearch] = useState('');

  const filteredCategories = EMOJI_CATEGORIES.map(cat => {
    if (!search) return cat;
    if (cat.name.toLowerCase().includes(search.toLowerCase())) return cat;
    return null;
  }).filter(Boolean) as typeof EMOJI_CATEGORIES;

  return (
    <div className="absolute bottom-20 left-4 bg-white/95 backdrop-blur-md border border-slate-205 dark:border-slate-800 shadow-2xl rounded-2xl p-3 w-80 h-96 z-50 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('emoji')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'emoji' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            😀 Emojis
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sticker')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'sticker' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🖼️ Figurinhas
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
        >
          <X size={12} />
        </button>
      </div>

      {/* Emoji Search / Sticker subtabs */}
      {activeTab === 'emoji' ? (
        <input
          type="text"
          placeholder="Pesquisar categorias de emojis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary/50 transition-colors placeholder-slate-400 font-medium text-slate-800 dark:text-slate-200"
        />
      ) : (
        <div className="flex gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
          <button
            type="button"
            onClick={() => setActiveStickerSubTab('default')}
            className={`text-[9px] font-extrabold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              activeStickerSubTab === 'default'
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50'
            }`}
          >
            Padrão
          </button>
          <button
            type="button"
            onClick={() => setActiveStickerSubTab('favorites')}
            className={`text-[9px] font-extrabold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
              activeStickerSubTab === 'favorites'
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50'
            }`}
          >
            <Star size={8} fill="currentColor" /> Favoritas ({favoriteStickers.length})
          </button>
        </div>
      )}

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
        {activeTab === 'emoji' ? (
          <div className="space-y-3">
            {filteredCategories.map((cat) => (
              <div key={cat.name} className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider block">
                  {cat.name}
                </span>
                <div className="grid grid-cols-8 gap-1.5">
                  {cat.emojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectEmoji(emoji)}
                      className="text-lg hover:scale-120 active:scale-95 transition-transform duration-100 flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                Nenhuma categoria encontrada
              </div>
            )}
          </div>
        ) : activeStickerSubTab === 'default' ? (
          <div className="grid grid-cols-4 gap-2.5 p-1">
            {PREDEFINED_STICKERS.map((stickerUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectSticker(stickerUrl)}
                className="aspect-square p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer bg-white dark:bg-slate-900"
              >
                <img src={stickerUrl} alt={`Sticker ${idx}`} className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2.5 p-1">
            {favoriteStickers.map((stickerUrl, idx) => (
              <div
                key={idx}
                className="relative group aspect-square p-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center"
              >
                <button
                  type="button"
                  onClick={() => onSelectSticker(stickerUrl)}
                  className="w-full h-full hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  <img src={stickerUrl} alt={`Favorite ${idx}`} className="w-full h-full object-contain" />
                </button>
              </div>
            ))}
            {favoriteStickers.length === 0 && (
              <div className="col-span-4 text-center py-8 text-slate-400 text-xs font-medium px-4 leading-relaxed">
                Nenhuma figurinha salva ainda.<br/>
                <span className="text-[10px] text-slate-405 font-semibold block mt-1.5">
                  Passe o mouse sobre uma figurinha no chat e clique na estrela ⭐ para salvar!
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InboxPage() {
  const {
    conversations,
    contacts,
    users,
    departments,
    quickReplies,
    templates,
    currentUserId,
    stages,
    sendMessage,
    sendInternalNote,
    sendWhisper,
    claimConversation,
    takeOverConversation,
    transferConversation,
    resolveConversation,
    addDeal,
    addTask,
    routingLogs,
    demo_mode_enabled,
    syncDatabaseState,
    fetchUsers,
    selectedConversationId: selectedConvId,
    setSelectedConversationId: setSelectedConvId
  } = useStore();




  const [activeTab, setActiveTab] = useState<'new' | 'meus' | 'pending' | 'closed' | 'sector'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [inputMode, setInputMode] = useState<'public' | 'private' | 'whisper'>('public');
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);

  // Synchronize active tab based on selected conversation status/assignment
  useEffect(() => {
    if (selectedConvId) {
      const conv = conversations.find((c) => c.id === selectedConvId);
      if (conv) {
        if (conv.status === 'new') {
          setActiveTab('new');
        } else if (conv.status === 'open') {
          if (conv.assignedUserId === currentUserId) {
            setActiveTab('meus');
          } else {
            setActiveTab('sector');
          }
        } else if (conv.status === 'pending') {
          setActiveTab('pending');
        } else if (conv.status === 'closed') {
          setActiveTab('closed');
        }
      }
    }
  }, [selectedConvId, conversations, currentUserId]);
  const [timeTick, setTimeTick] = useState(0);
  const [attachedFile, setAttachedFile] = useState<{ file: File; base64: string } | null>(null);
  const [favoriteStickers, setFavoriteStickers] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hbflow_favorite_stickers');
      if (saved) {
        try {
          setFavoriteStickers(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleFavoriteSticker = (url: string) => {
    let updated: string[];
    if (favoriteStickers.includes(url)) {
      updated = favoriteStickers.filter(s => s !== url);
    } else {
      updated = [...favoriteStickers, url];
    }
    setFavoriteStickers(updated);
    localStorage.setItem('hbflow_favorite_stickers', JSON.stringify(updated));
  };

  const handleSendSticker = async (stickerUrl: string) => {
    if (!selectedConvId) return;
    setShowEmojiPicker(false);
    
    let base64 = stickerUrl;
    if (stickerUrl.startsWith('http')) {
      base64 = await convertUrlToBase64(stickerUrl);
    }
    
    sendMessage(selectedConvId, '[Figurinha]', 'user', {
      mediaUrl: base64,
      mimeType: 'image/webp',
      type: 'image',
      fileName: 'sticker.webp'
    });
  };

  const [sortBy, setSortBy] = useState<'recent' | 'sla'>('recent');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio Recording States & Refs
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordPaused, setIsRecordPaused] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordCancelledRef = useRef(false);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAttachedFile({ file, base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
        }
      }
    }
  };

  // Audio Recording Methods
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      isRecordCancelledRef.current = false;
      setRecordDuration(0);
      setIsRecordPaused(false);

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (isRecordCancelledRef.current) {
          audioChunksRef.current = [];
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          if (selectedConvId) {
            sendMessage(selectedConvId, '[Áudio]', 'user', {
              mediaUrl: base64,
              mimeType: 'audio/webm',
              type: 'audio',
              fileName: `audio_${Date.now()}.webm`
            });
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      setIsRecording(true);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsRecordPaused(true);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsRecordPaused(false);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      isRecordCancelledRef.current = true;
      mediaRecorderRef.current.stop();
    }
    cleanupRecording();
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current) {
      isRecordCancelledRef.current = false;
      mediaRecorderRef.current.stop();
    }
    cleanupRecording();
  };

  const cleanupRecording = () => {
    setIsRecording(false);
    setIsRecordPaused(false);
    setRecordDuration(0);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    };
  }, []);

  // Sincronização inicial de redundância ao montar a tela
  useEffect(() => {
    syncDatabaseState();
    fetchUsers();
  }, [syncDatabaseState, fetchUsers]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const getElapsedTime = (isoString: string | null) => {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs < 0) return '0s';
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    if (diffMins === 0) {
      return `${diffSecs}s`;
    }
    return `${diffMins}m ${diffSecs}s`;
  };
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Dialog states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Transfer forms
  const [transferTargetUser, setTransferTargetUser] = useState('');
  const [transferTargetDept, setTransferTargetDept] = useState('');

  // Opportunity forms
  const [oppTitle, setOppTitle] = useState('');
  const [oppValue, setOppValue] = useState('500');
  const [oppProducts, setOppProducts] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || { id: '', name: 'Usuário', email: '', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces', role: 'Atendente', presence: 'offline', filters: [] };

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConvId, conversations]);

  // Obter apenas o chamado mais recente de cada contato para evitar duplicados no sidebar
  const contactLatestConv: Record<string, Conversation> = {};
  conversations.forEach((c) => {
    const existing = contactLatestConv[c.contactId];
    if (!existing) {
      contactLatestConv[c.contactId] = c;
    } else {
      const timeExisting = existing.lastMessageAt ? new Date(existing.lastMessageAt).getTime() : new Date(existing.createdAt).getTime();
      const timeCurrent = c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : new Date(c.createdAt).getTime();
      if (timeCurrent > timeExisting) {
        contactLatestConv[c.contactId] = c;
      }
    }
  });
  const uniqueLatestConversations = Object.values(contactLatestConv);

  // Filter conversations
  const filteredConversations = uniqueLatestConversations.filter((c) => {
    const contact = contacts.find((ct) => ct.id === c.contactId);
    if (!contact) return false;

    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    if (selectedTagFilter && !contact.tags.includes(selectedTagFilter)) {
      return false;
    }

    if (activeTab === 'new') {
      return c.status === 'new';
    } else if (activeTab === 'meus') {
      return c.status === 'open' && c.assignedUserId === currentUserId;
    } else if (activeTab === 'sector') {
      return (
        c.status === 'open' &&
        c.assignedUserId !== currentUserId &&
        c.assignedUserId !== null &&
        c.departmentId !== null &&
        currentUser.filters.includes(
          departments.find((d) => d.id === c.departmentId)?.name.toLowerCase() || ''
        )
      );
    } else if (activeTab === 'pending') {
      return c.status === 'pending';
    } else if (activeTab === 'closed') {
      return c.status === 'closed';
    }

    return true;
  });

  // Sort conversations dynamically
  const sortedAndFilteredConvs = [...filteredConversations].sort((a, b) => {
    if (sortBy === 'sla') {
      const limitA = a.slaLimitAt ? new Date(a.slaLimitAt).getTime() : Infinity;
      const limitB = b.slaLimitAt ? new Date(b.slaLimitAt).getTime() : Infinity;
      if (limitA !== limitB) {
        return limitA - limitB;
      }
    }
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  const activeConv = conversations.find((c) => c.id === selectedConvId);
  const activeContact = activeConv ? contacts.find((c) => c.id === activeConv.contactId) : null;
  const activeUserAssigned = activeConv ? users.find((u) => u.id === activeConv.assignedUserId) : null;
  const activeDept = activeConv ? departments.find((d) => d.id === activeConv.departmentId) : null;

  useEffect(() => {
    if (activeConv) {
      if (activeConv.assignedUserId === currentUserId) {
        setInputMode('public');
      } else {
        setInputMode('private');
      }

      // Clear unread count when selected/opened
      if (activeConv.unreadCount > 0) {
        useStore.setState((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === activeConv.id ? { ...c, unreadCount: 0 } : c
          )
        }));

        if (!demo_mode_enabled) {
          fetch(`/api/conversations/${activeConv.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ unreadCount: 0 })
          }).catch((err) => console.error('Error clearing unread count:', err));
        }
      }
    }
  }, [selectedConvId, activeConv?.id, activeConv?.unreadCount, activeConv?.assignedUserId, currentUserId, demo_mode_enabled]);

  // Actions
  const handleClaim = (convId: string) => {
    setClaimError(null);
    const result = claimConversation(convId, currentUserId);
    if (!result.success) {
      setClaimError(result.error || 'Falha ao assumir.');
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !attachedFile) || !selectedConvId) return;

    const trimmedText = messageText.trim();

    if (attachedFile) {
      const isImg = attachedFile.file.type.startsWith('image/');
      const isAudio = attachedFile.file.type.startsWith('audio/');
      const isVideo = attachedFile.file.type.startsWith('video/');
      const mediaType = isImg ? 'image' : isAudio ? 'audio' : isVideo ? 'video' : 'document';
      
      const bodyText = trimmedText || (isImg ? '[Imagem]' : isAudio ? '[Áudio]' : isVideo ? '[Vídeo]' : '[Documento]');

      sendMessage(selectedConvId, bodyText, 'user', {
        mediaUrl: attachedFile.base64,
        mimeType: attachedFile.file.type,
        type: mediaType,
        fileName: attachedFile.file.name
      });
    } else {
      if (inputMode === 'whisper') {
        sendWhisper(selectedConvId, trimmedText);
      } else if (inputMode === 'private') {
        sendInternalNote(selectedConvId, trimmedText);
      } else {
        sendMessage(selectedConvId, trimmedText, 'user');
      }
    }

    setMessageText('');
    setAttachedFile(null);
  };

  const handleApplyQuickReply = (text: string) => {
    setMessageText(text);
    setShowQuickReplies(false);
  };

  const isTrigger = messageText.startsWith('/') || messageText.startsWith('!');
  const typedText = messageText.toLowerCase();
  const matchingReplies = isTrigger
    ? quickReplies.filter((qr) => {
        const shortcutLower = qr.shortcut.toLowerCase();
        if (typedText === '/' || typedText === '!') {
          return shortcutLower.startsWith(typedText);
        }
        return (
          shortcutLower.startsWith(typedText) ||
          shortcutLower.includes(typedText) ||
          (qr.title && qr.title.toLowerCase().includes(typedText)) ||
          qr.message.toLowerCase().includes(typedText)
        );
      })
    : [];

  const showAutocomplete = isTrigger && matchingReplies.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocompleteIndex((prev) => (prev + 1) % matchingReplies.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocompleteIndex((prev) => (prev - 1 + matchingReplies.length) % matchingReplies.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selectedReply = matchingReplies[autocompleteIndex];
        if (selectedReply) {
          handleApplyQuickReply(selectedReply.message);
        }
      }
    }
  };

  const handleApplyTemplate = (body: string) => {
    let parsedBody = body
      .replace('{{nome_cliente}}', activeContact?.name || 'Cliente')
      .replace('{{nome_atendente}}', currentUser.name)
      .replace('{{nome_empresa}}', 'HBFlow')
      .replace('{{protocolo}}', `HB-${Math.floor(Math.random() * 90000) + 10000}`)
      .replace('{{produto}}', 'Óculos de Sol Classic')
      .replace('{{data}}', new Date().toLocaleDateString('pt-BR'));

    setMessageText(parsedBody);
    setShowTemplates(false);
  };

  const executeTransfer = () => {
    if (!selectedConvId) return;
    transferConversation(
      selectedConvId,
      transferTargetUser || null,
      transferTargetDept || null
    );
    setShowTransferModal(false);
    setTransferTargetUser('');
    setTransferTargetDept('');
  };

  const executeCreateOpportunity = () => {
    if (!activeContact) return;
    addDeal({
      contactId: activeContact.id,
      stageId: 'stage-1',
      assignedUserId: currentUserId,
      title: oppTitle || `Negócio - ${activeContact.name}`,
      value: parseFloat(oppValue) || 0,
      probability: 60,
      origin: 'WhatsApp Inbox',
      products: oppProducts || 'Nenhum',
      expectedClose: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'open',
      notes: 'Oportunidade gerada automaticamente a partir da conversa.'
    });

    addTask({
      contactId: activeContact.id,
      dealId: null,
      assignedUserId: currentUserId,
      title: `Contatar ${activeContact.name} sobre proposta`,
      type: 'proposal',
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'high',
      notes: 'Ligar para validar preços enviados pelo chat.'
    });

    setShowOpportunityModal(false);
    setOppTitle('');
    setOppProducts('');
  };

  const isSlaBreached = (limitStr: string | null) => {
    if (!limitStr) return false;
    return new Date(limitStr) < new Date();
  };

  return (
    <div className="h-[calc(100vh-6rem)] -m-6 flex bg-white overflow-hidden select-none">
      
      {/* COLUMN 1: LEFT NAVIGATION TABS */}
      <div className="w-56 border-r border-slate-200 bg-slate-50/70 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 bg-white">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 block mb-3">
            Filtros Principal
          </span>
          <div className="space-y-1">
            <button
              onClick={() => {
                setActiveTab('new');
                setSelectedConvId(null);
              }}
              className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'new' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span>Novos Chamados</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === 'new' ? 'bg-white text-primary' : 'bg-slate-200 text-slate-700'}`}>
                {conversations.filter(c => c.status === 'new').length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('meus');
                setSelectedConvId(null);
              }}
              className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'meus' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span>Meus Atendimentos</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === 'meus' ? 'bg-white text-primary' : 'bg-slate-200 text-slate-700'}`}>
                {conversations.filter(c => c.status === 'open' && c.assignedUserId === currentUserId).length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('sector');
                setSelectedConvId(null);
              }}
              className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'sector' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span>Atendimentos do Setor</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === 'sector' ? 'bg-white text-primary' : 'bg-slate-200 text-slate-700'}`}>
                {
                  conversations.filter(
                    (c) =>
                      c.status === 'open' &&
                      c.assignedUserId !== currentUserId &&
                      c.assignedUserId !== null &&
                      c.departmentId &&
                      currentUser.filters.includes(
                        departments.find((d) => d.id === c.departmentId)?.name.toLowerCase() || ''
                      )
                  ).length
                }
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('pending');
                setSelectedConvId(null);
              }}
              className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'pending' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span>Aguardando Cliente</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === 'pending' ? 'bg-white text-primary' : 'bg-slate-200 text-slate-700'}`}>
                {conversations.filter(c => c.status === 'pending').length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('closed');
                setSelectedConvId(null);
              }}
              className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'closed' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span>Finalizados</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === 'closed' ? 'bg-white text-primary' : 'bg-slate-200 text-slate-700'}`}>
                {conversations.filter(c => c.status === 'closed').length}
              </span>
            </button>
          </div>
        </div>

        {/* Tags list */}
        <div className="flex-1 p-4 overflow-y-auto">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 block mb-2">
            Filtrar Etiquetas
          </span>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedTagFilter(null)}
              className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-all ${
                !selectedTagFilter ? 'bg-slate-200 text-slate-800 font-bold' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Todas as tags
            </button>
            {Array.from(new Set(contacts.flatMap((c) => c.tags || []).filter(Boolean)))
              .sort()
              .map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTagFilter(tag)}
                  className={`w-full text-left text-xs px-3 py-1.5 rounded-lg transition-all capitalize flex items-center gap-1.5 ${
                    selectedTagFilter === tag ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  <TagIcon size={12} className="text-primary/70 shrink-0" />
                  <span className="truncate">{tag}</span>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* COLUMN 2: CHATS LIST */}
      <div className="w-80 border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 flex flex-col gap-2 shrink-0 bg-slate-50/30">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs outline-none focus:border-primary transition-all font-medium"
            />
          </div>
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 px-1 select-none">
            <span>ORDENAR</span>
            <div className="flex gap-1.5">
              <button 
                onClick={() => setSortBy('recent')}
                className={`transition-colors cursor-pointer ${sortBy === 'recent' ? 'text-primary font-black' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Recentes
              </button>
              <span>•</span>
              <button 
                onClick={() => setSortBy('sla')}
                className={`transition-colors cursor-pointer ${sortBy === 'sla' ? 'text-primary font-black' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Urgência SLA
              </button>
            </div>
          </div>
        </div>

        {/* Chats grid list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
          {sortedAndFilteredConvs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">Nenhum chamado encontrado.</div>
          ) : (
            sortedAndFilteredConvs.map((c) => {
              const contact = contacts.find((ct) => ct.id === c.contactId);
              const lastMsg = c.messages[c.messages.length - 1];
              const lastActivity = lastMsg?.createdAt || c.lastMessageAt || c.updatedAt || c.createdAt;
              const isSelected = c.id === selectedConvId;
              const dept = departments.find((d) => d.id === c.departmentId);
              const agent = users.find((u) => u.id === c.assignedUserId);
              const breached = c.status !== 'closed' && isSlaBreached(c.slaLimitAt);

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedConvId(c.id);
                    setClaimError(null);
                  }}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-all flex flex-col gap-2 relative ${
                    isSelected ? 'bg-primary/5 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-800 truncate">{contact?.name}</span>
                    <span className="text-[9px] text-slate-400 font-semibold" suppressHydrationWarning>
                      {lastActivity ? formatMessageTime(lastActivity) : ''}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 truncate leading-relaxed">
                    {lastMsg ? (
                      lastMsg.senderType === 'contact' ? (
                        lastMsg.body
                      ) : lastMsg.senderType === 'user' ? (
                        <>
                          <span className="font-semibold text-slate-650">
                            {lastMsg.senderName === currentUser?.name ? 'Você' : (lastMsg.senderName || 'Atendente')}:
                          </span>{' '}
                          {lastMsg.body}
                        </>
                      ) : lastMsg.senderType === 'system' || lastMsg.senderType === 'automation' ? (
                        <>
                          <span className="font-semibold text-slate-650">Sistema:</span> {lastMsg.body}
                        </>
                      ) : (
                        lastMsg.body
                      )
                    ) : (
                      'Sem mensagens no histórico'
                    )}
                  </p>


                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-semibold">
                    {c.status === 'new' && c.waitStartedAt && (
                      <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                        <Clock size={10} className="animate-pulse" />
                        <span>Fila: {getElapsedTime(c.waitStartedAt)}</span>
                      </span>
                    )}
                    {c.status === 'open' && c.claimedAt && (
                      <span className="flex items-center gap-1 text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                        <Clock size={10} />
                        <span>Ativo: {getElapsedTime(c.claimedAt)}</span>
                      </span>
                    )}
                    {c.status !== 'closed' && c.slaLimitAt && (() => {
                      const limit = new Date(c.slaLimitAt).getTime();
                      const diffMs = limit - Date.now();
                      const breached = diffMs < 0;
                      const absMin = Math.abs(Math.floor(diffMs / 60000));
                      
                      return (
                        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border font-bold ${
                          breached 
                            ? 'text-rose-600 bg-rose-50 border-rose-100 animate-pulse font-extrabold' 
                            : 'text-indigo-650 bg-indigo-50 border-indigo-100'
                        }`}>
                          <Clock size={10} />
                          <span>
                            {breached ? `SLA Estourado há ${absMin}m` : `SLA Restante: ${absMin}m`}
                          </span>
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1.5 mt-1">
                    {/* Tags row */}
                    <div className="flex flex-wrap gap-1">
                      {dept && (
                        <span
                          className="text-[8.5px] font-extrabold px-2 py-0.5 rounded text-white"
                          style={{ backgroundColor: dept.color }}
                        >
                          {dept.name}
                        </span>
                      )}
                      {contact?.tags.map((t) => (
                        <span key={t} className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold capitalize border border-slate-200/60">
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Unread count & SLA warning */}
                    <div className="flex items-center gap-1">
                      {breached && (
                        <span className="text-[8px] font-black uppercase bg-rose-500 text-white px-1.5 py-0.5 rounded animate-pulse">
                          SLA Breached
                        </span>
                      )}
                      {c.unreadCount > 0 && (
                        <span className="w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {agent && (
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 pt-1 border-t border-dashed border-slate-100">
                      <User size={10} className="text-slate-400 shrink-0" />
                      <span>Atendente: <strong className="text-slate-600 font-semibold">{agent.name}</strong></span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMN 3: CHAT VIEWPORT / TRIAGEM DASHBOARD */}
      <div className="flex-1 bg-slate-50 flex flex-col min-w-0">
        {activeConv && activeContact ? (
          <>
            {/* Active Chat Header */}
            <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-primary/20">
                  {activeContact.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{activeContact.name}</h4>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-slate-400 block truncate font-medium">
                      {activeContact.phone} • Origem: <span className="font-semibold text-slate-600 uppercase">{activeContact.origin}</span>
                    </span>
                    {activeConv.status === 'new' && activeConv.waitStartedAt && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 shrink-0">
                        <Clock size={10} className="animate-pulse" />
                        <span>Tempo de Espera: {getElapsedTime(activeConv.waitStartedAt)}</span>
                      </span>
                    )}
                    {activeConv.status === 'open' && activeConv.claimedAt && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 shrink-0">
                        <Clock size={10} />
                        <span>Em atendimento: {getElapsedTime(activeConv.claimedAt)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                {activeConv.status !== 'closed' && (
                  <>
                    {activeConv.assignedUserId !== null && activeConv.assignedUserId !== currentUserId && 
                     ['Admin', 'Supervisor', 'Gestor'].includes(currentUser.role) && (
                      <button
                        onClick={() => takeOverConversation(activeConv.id, currentUserId)}
                        className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer animate-pulse shrink-0"
                        title="Assumir o atendimento deste operador (Intervenção de Supervisor)"
                      >
                        <UserPlus size={13} />
                        <span>Assumir Atendimento</span>
                      </button>
                    )}

                    <button
                      onClick={() => setShowOpportunityModal(true)}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-primary rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                      title="Vincular ao pipeline de vendas"
                    >
                      <FolderPlus size={14} />
                      <span className="hidden sm:inline">Criar Oportunidade</span>
                    </button>

                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-primary rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                      title="Transferir fila/atendente"
                    >
                      <Share2 size={14} />
                      <span className="hidden sm:inline">Transferir</span>
                    </button>

                    <button
                      onClick={() => resolveConversation(activeConv.id)}
                      className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Resolver Chamado</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Chat message bubbles viewport */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f0f2f5] relative">
              {/* Wallpaper Grid layer representation */}
              <div className="absolute inset-0 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

              {/* AI Resolution Summary Card */}
              {activeConv.status === 'closed' && activeConv.aiSummary && (
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-slate-800/40 dark:to-indigo-950/20 border border-violet-200/60 dark:border-indigo-900/50 rounded-3xl p-5 shadow-md relative z-10 max-w-xl mx-auto my-3 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-violet-600/10">
                      🤖
                    </div>
                    <h5 className="text-xs font-extrabold text-violet-850 dark:text-violet-300 uppercase tracking-widest">
                      Relatório Comercial IA (CCP Insights)
                    </h5>
                  </div>
                  
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl p-4 border border-violet-100 dark:border-violet-950/40 text-[11.5px] text-slate-700 dark:text-slate-350 space-y-2 leading-relaxed">
                    {activeConv.aiSummary.split('\n').filter(l => l && !l.includes('###')).map((line, idx) => {
                      const parts = line.split(':');
                      if (parts.length >= 2) {
                        const label = parts[0].replace(/\*\*/g, '').trim();
                        const val = parts.slice(1).join(':').replace(/\*\*/g, '').trim();
                        return (
                          <div key={idx} className="flex justify-between border-b border-dashed border-slate-100 dark:border-slate-800/40 pb-1.5 last:border-b-0 last:pb-0">
                            <span className="font-extrabold text-slate-500 dark:text-slate-450">{label}:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-right">{val}</span>
                          </div>
                        );
                      }
                      return <p key={idx} className="font-medium text-violet-900 dark:text-violet-200">{line}</p>;
                    })}
                  </div>
                  <div className="text-[9px] text-slate-400 dark:text-slate-550 mt-2 text-right italic font-medium">
                    Gerado automaticamente na conclusão do chamado
                  </div>
                </div>
              )}

              {/* Claim warning panel if state is new */}
              {activeConv.status === 'new' && (
                <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 flex flex-col items-center justify-center text-center max-w-sm mx-auto shadow-2xl relative z-10 my-4 animate-in zoom-in-95 duration-200">
                  <UserPlus className="text-primary mb-3" size={32} />
                  <h5 className="text-sm font-bold">Chamado na Fila de Triagem</h5>
                  <p className="text-[10.5px] text-slate-400 mt-2 leading-relaxed">
                    Nenhum atendente está vinculado ainda. Assuma o atendimento para responder ao cliente e registrar histórico.
                  </p>
                  <button
                    onClick={() => handleClaim(activeConv.id)}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 px-6 rounded-xl mt-4 transition-all shadow-lg shadow-primary/20 active:scale-95 cursor-pointer"
                  >
                    Assumir Atendimento
                  </button>
                  {claimError && (
                    <p className="text-[10px] text-rose-500 font-bold mt-3 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                      {claimError}
                    </p>
                  )}
                </div>
              )}

              {/* Messages list */}
              <div className="space-y-3 relative z-10">
                {(activeContact 
                  ? conversations
                      .filter((c) => c.contactId === activeContact.id)
                      .flatMap((c) => c.messages)
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  : activeConv.messages
                ).map((m) => {
                  const isUser = m.senderType === 'user';
                  const isContact = m.senderType === 'contact';
                  const isSystem = m.senderType === 'system';
                  const isAuto = m.senderType === 'automation';
                  const isInternalNote = m.senderType === 'internal_note';
                  const isWhisper = m.senderType === 'whisper';
                  
                  const isMyNote = isInternalNote && m.senderName === currentUser.name;
                  const isMyWhisper = isWhisper && m.senderName === currentUser.name;

                  return (
                    <div
                      key={m.id}
                      className={`flex ${
                        (isUser || isMyNote || isMyWhisper) ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start'
                      }`}
                    >
                      {isSystem ? (
                        <div className="chat-bubble-system text-[10px] font-bold px-3 py-1.5 rounded-full text-slate-500 shadow-sm border border-slate-200 bg-slate-50">
                          {m.body}
                        </div>
                      ) : (m.type === 'image' && (m.mimeType === 'image/webp' || m.body === '[Figurinha]')) ? (
                        <div className={`max-w-[70%] relative group my-1 flex flex-col ${(isUser || isMyNote || isMyWhisper) ? 'items-end' : 'items-start'}`}>
                          {/* Sender identity */}
                          {!(isUser || isMyNote || isMyWhisper) && (
                            <span className="text-[8.5px] font-extrabold block mb-1 uppercase tracking-wider text-slate-450 dark:text-slate-400">
                              {m.senderName}
                            </span>
                          )}
                          <div className="relative max-w-[120px] max-h-[120px] flex items-center justify-center p-1 bg-transparent">
                            <img
                              src={m.mediaUrl}
                              alt="Figurinha"
                              className="w-full h-full object-contain hover:scale-105 transition-transform duration-200 cursor-pointer"
                              onClick={() => {
                                const w = window.open();
                                if (w) w.document.write(`<img src="${m.mediaUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                              }}
                            />
                            {/* Star favorite button */}
                            {m.mediaUrl && (
                              <button
                                type="button"
                                onClick={() => handleFavoriteSticker(m.mediaUrl!)}
                                className="absolute -top-1 -right-1 bg-white/95 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-500 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer z-20 flex items-center justify-center"
                                title={favoriteStickers.includes(m.mediaUrl) ? "Remover dos favoritos" : "Favoritar Figurinha"}
                              >
                                <Star size={11} fill={favoriteStickers.includes(m.mediaUrl) ? "currentColor" : "none"} />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[8.5px] mt-1 font-medium text-slate-400">
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {(isUser || isMyNote || isMyWhisper) && m.status === 'read' && (
                              <span className="text-emerald-500 font-extrabold text-[9px]">✓✓</span>
                            )}
                          </div>
                        </div>
                      ) : isInternalNote ? (
                        <div
                          className={`max-w-[70%] p-3.5 rounded-2xl shadow-sm text-xs relative bg-amber-50 border-l-4 border-l-amber-500 border-amber-200 text-amber-900 ${
                            isMyNote ? 'rounded-tr-none' : 'rounded-tl-none'
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider flex items-center gap-1">
                              🔒 Nota Interna (Privada)
                            </span>
                            <span className="text-[10px] text-amber-500 font-semibold">• {m.senderName}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed font-medium">{m.body}</p>
                          <div className="flex items-center justify-end text-[8.5px] mt-2 font-medium text-amber-600/70">
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                         </div>
                      ) : isWhisper ? (
                        <div
                          className={`max-w-[70%] p-3.5 rounded-2xl shadow-sm text-xs relative bg-sky-50 border-l-4 border-l-sky-500 border-sky-200 text-sky-900 ${
                            isMyWhisper ? 'rounded-tr-none' : 'rounded-tl-none'
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] text-sky-600 font-extrabold uppercase tracking-wider flex items-center gap-1">
                              🤫 Sussurro do Supervisor (Privado)
                            </span>
                            <span className="text-[10px] text-sky-500 font-semibold">• {m.senderName}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed font-medium">{m.body}</p>
                          <div className="flex items-center justify-end text-[8.5px] mt-2 font-medium text-sky-600/70">
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`max-w-[70%] p-3.5 rounded-2xl shadow-sm text-xs relative ${
                            isUser
                              ? 'chat-bubble-user rounded-tr-none'
                              : isAuto
                              ? 'chat-bubble-automation rounded-tl-none'
                              : 'chat-bubble-contact rounded-tl-none border border-slate-200'
                          }`}
                        >
                          {/* Sender identity */}
                          <span className={`text-[8.5px] font-extrabold block mb-1 uppercase tracking-wider ${
                            isUser ? 'text-purple-200' : isAuto ? 'text-purple-700' : 'text-slate-400'
                          }`}>
                            {m.senderName}
                          </span>

                          {m.type === 'image' && m.mediaUrl && (
                            <div className="my-2 rounded-xl overflow-hidden border border-slate-200/60 bg-white max-w-sm max-h-72 shadow-sm">
                              <img
                                src={m.mediaUrl}
                                alt="Imagem enviada"
                                className="w-full h-full object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                onClick={() => {
                                  const w = window.open();
                                  if (w) w.document.write(`<img src="${m.mediaUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                                }}
                              />
                            </div>
                          )}
                          {m.type === 'audio' && m.mediaUrl && (
                            <AudioPlayer
                              src={m.mediaUrl}
                              messageId={m.id}
                              conversationId={selectedConvId || m.conversationId}
                              initialBody={m.body}
                            />
                          )}
                          {m.type === 'video' && m.mediaUrl && (
                            <div className="my-2 rounded-xl overflow-hidden border border-slate-200/60 bg-black max-w-sm max-h-72 shadow-sm">
                              <video src={m.mediaUrl} controls className="w-full h-full object-contain" />
                            </div>
                          )}
                          {m.type === 'document' && m.mediaUrl && (
                            <div className="my-2">
                              <a
                                href={m.mediaUrl}
                                download={m.body || 'Documento'}
                                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 p-2.5 rounded-xl border border-slate-200 transition-all text-primary font-bold w-fit text-[11px] shadow-sm"
                              >
                                <Paperclip size={13} className="text-primary shrink-0" />
                                <span className="underline truncate max-w-[180px]">{m.body || 'Download Documento'}</span>
                              </a>
                            </div>
                          )}
                          {(!m.mediaUrl || (m.body && !['[Imagem]', '[Áudio]', '[Vídeo]', '[Documento]'].includes(m.body) && m.type !== 'document')) && (
                            <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                          )}

                          <div className={`flex items-center justify-end gap-1 text-[8.5px] mt-2 font-medium ${
                            isUser ? 'text-purple-200' : 'text-slate-400'
                          }`}>
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isUser && m.status === 'read' && (
                              <span className="text-emerald-400 font-extrabold text-[9px]">✓✓</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div ref={chatEndRef} />
            </div>

            {/* Chat footer input bar */}
            {activeConv.status !== 'closed' ? (
              <div className="bg-white border-t border-slate-200 p-4 shrink-0 relative z-10">
                {/* Hotkeys selector bar */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickReplies(!showQuickReplies);
                      setShowTemplates(false);
                    }}
                    className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] text-slate-600 font-bold transition-colors cursor-pointer"
                  >
                    <Smile size={12} className="text-primary" />
                    <span>Respostas Rápidas</span>
                  </button>
                </div>

                {/* Dropdowns */}
                {showQuickReplies && (
                  <div className="absolute bottom-20 left-4 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-3 w-96 z-40 flex flex-col gap-2 max-h-72 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-100">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                        <Smile size={12} className="text-primary" />
                        Respostas Rápidas (Atalhos)
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setShowQuickReplies(false)} 
                        className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 max-h-52 scrollbar-thin">
                      {quickReplies.map((qr) => (
                        <button
                          key={qr.id}
                          type="button"
                          onClick={() => handleApplyQuickReply(qr.message)}
                          className="w-full text-left text-xs p-2.5 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/10 transition-all duration-200 group flex items-start justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className="inline-block bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-mono text-[9px] font-bold self-start tracking-wide uppercase select-none">
                              {qr.shortcut}
                            </span>
                            <span className="text-slate-600 font-medium leading-relaxed break-words line-clamp-2 text-[11px]">
                              {qr.message}
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold text-primary/0 group-hover:text-primary transition-all duration-200 shrink-0 self-center flex items-center gap-0.5 translate-x-1 group-hover:translate-x-0">
                            Usar <ArrowRight size={10} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}



                <div className="flex justify-between items-center mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl">
                    <button
                      type="button"
                      disabled={activeConv.assignedUserId !== currentUserId}
                      onClick={() => setInputMode('public')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        inputMode === 'public'
                          ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 disabled:opacity-50'
                      }`}
                    >
                      <MessageSquare size={12} />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('private')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        inputMode === 'private'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>Nota Interna 🔒</span>
                    </button>
                    {['Admin', 'Supervisor', 'Gestor'].includes(currentUser.role) && (
                      <button
                        type="button"
                        onClick={() => setInputMode('whisper')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          inputMode === 'whisper'
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span>Sussurrar 🤫</span>
                      </button>
                    )}
                  </div>
                  {activeConv.assignedUserId !== currentUserId && inputMode !== 'whisper' && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100 animate-pulse">
                      Apenas Notas Internas (Atendido por {activeUserAssigned?.name || 'outro agente'})
                    </span>
                  )}
                  {activeConv.assignedUserId !== currentUserId && inputMode === 'whisper' && (
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-100 animate-pulse">
                      Modo Sussurro 🤫 (Mensagem invisível para o cliente)
                    </span>
                  )}
                </div>

                {attachedFile && (
                  <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-xl flex items-center gap-3 shrink-0">
                    <div className="relative w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-white overflow-hidden shadow-sm shrink-0">
                      {attachedFile.file.type.startsWith('image/') ? (
                        <img src={attachedFile.base64} className="w-full h-full object-cover" alt="Anexo preview" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-extrabold text-[10px] uppercase">
                          {attachedFile.file.name.split('.').pop()?.substring(0, 3)}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="absolute top-0.5 right-0.5 w-4.5 h-4.5 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white flex items-center justify-center transition-colors shadow-sm"
                      >
                        <X size={9} />
                      </button>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                        {attachedFile.file.name}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium font-mono">
                        {(attachedFile.file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                )}

                {isRecording ? (
                  <div className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shrink-0 w-full shadow-inner">
                    {/* Pulsing red dot and recording timer */}
                    <div className="flex items-center gap-2 px-3">
                      <span className={`w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 ${!isRecordPaused ? 'animate-pulse' : ''}`} />
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                        {formatDuration(recordDuration)}
                      </span>
                      {isRecordPaused && (
                        <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40 border border-amber-100 px-1.5 py-0.5 rounded-md uppercase tracking-wider select-none shrink-0">
                          Pausado
                        </span>
                      )}
                    </div>

                    <div className="flex-1" />

                    {/* Discard / Cancel button */}
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer shadow-sm border border-rose-100 dark:border-rose-900/30"
                      title="Cancelar gravação"
                    >
                      <Trash2 size={16} />
                    </button>

                    {/* Pause / Resume toggle button */}
                    <button
                      type="button"
                      onClick={isRecordPaused ? resumeRecording : pauseRecording}
                      className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer shadow-sm border border-slate-200 dark:border-slate-700/50"
                      title={isRecordPaused ? "Retomar gravação" : "Pausar gravação"}
                    >
                      {isRecordPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                    </button>

                    {/* Stop and Send button */}
                    <button
                      type="button"
                      onClick={stopAndSendRecording}
                      className="p-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all shadow-md shadow-primary/15 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                      title="Enviar áudio"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Autocomplete Quick Replies */}
                    {showAutocomplete && (
                      <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 shadow-2xl rounded-2xl p-2 max-h-60 overflow-y-auto z-50 flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase tracking-wider select-none">
                          <span className="flex items-center gap-1">
                            <Smile size={12} className="text-primary" />
                            Sugestões de Atalhos ({matchingReplies.length})
                          </span>
                          <span className="text-[9px] font-medium lowercase">Use ↑↓ para navegar, Enter ou Tab para escolher</span>
                        </div>
                        {matchingReplies.map((qr, idx) => (
                          <button
                            key={qr.id}
                            type="button"
                            onClick={() => handleApplyQuickReply(qr.message)}
                            onMouseEnter={() => setAutocompleteIndex(idx)}
                            className={`w-full text-left text-xs p-2.5 rounded-xl border transition-all duration-150 group flex items-start justify-between gap-3 cursor-pointer ${
                              idx === autocompleteIndex
                                ? 'bg-primary/10 border-primary/20 text-slate-850 dark:text-slate-150'
                                : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="inline-block bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-mono text-[9px] font-bold tracking-wide uppercase select-none">
                                  {qr.shortcut}
                                </span>
                                {qr.title && (
                                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                    {qr.title}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] leading-relaxed break-all font-medium block max-w-full">
                                {qr.message}
                              </span>
                            </div>
                            <span className={`text-[10px] font-extrabold text-primary transition-all duration-150 shrink-0 self-center flex items-center gap-0.5 ${
                              idx === autocompleteIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-1'
                            }`}>
                              Selecionar <ArrowRight size={10} />
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <form onSubmit={handleSend} className={`flex-1 flex items-center gap-2 border rounded-2xl py-1.5 px-3 transition-all duration-200 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 ${
                      inputMode === 'whisper'
                        ? 'bg-sky-50/50 border-sky-200 focus-within:border-sky-400 focus-within:bg-sky-50'
                        : inputMode === 'private'
                        ? 'bg-amber-50/50 border-amber-200 focus-within:border-amber-400 focus-within:bg-amber-50'
                        : 'bg-slate-50 border-slate-200 focus-within:border-primary focus-within:bg-white'
                    }`}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,application/pdf,audio/*,video/*"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer shrink-0"
                        title="Anexar arquivo"
                      >
                        <Paperclip size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-1.5 transition-colors cursor-pointer shrink-0 ${showEmojiPicker ? 'text-primary' : 'text-slate-400 hover:text-slate-650'}`}
                        title="Emoji e Figurinhas"
                      >
                        <Smile size={15} />
                      </button>

                      {showEmojiPicker && (
                        <EmojiStickerPicker
                          onSelectEmoji={(emoji) => {
                            setMessageText((prev) => prev + emoji);
                          }}
                          onSelectSticker={handleSendSticker}
                          favoriteStickers={favoriteStickers}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      )}

                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => {
                          setMessageText(e.target.value);
                          setAutocompleteIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        disabled={activeConv.status === 'new'}
                        placeholder={
                          activeConv.status === 'new'
                            ? 'Assuma o atendimento para digitar...'
                            : inputMode === 'whisper'
                            ? 'Sussurrar para o atendente (Cliente não lê)...'
                            : inputMode === 'private'
                            ? 'Escreva uma nota interna privada...'
                            : 'Digite sua mensagem aqui...'
                        }
                        className="flex-1 bg-transparent border-0 outline-none text-xs text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-400 font-medium"
                      />

                      {(!messageText.trim() && !attachedFile) ? (
                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={activeConv.status === 'new'}
                          className="p-1.5 text-slate-400 hover:text-slate-600 transition-all shrink-0 cursor-pointer"
                          title="Gravar áudio"
                        >
                          <Mic size={15} />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={activeConv.status === 'new'}
                          className={`p-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                            inputMode === 'whisper'
                              ? 'text-sky-600 hover:text-sky-700'
                              : inputMode === 'private'
                              ? 'text-amber-600 hover:text-amber-700'
                              : 'text-primary hover:text-primary-hover'
                          }`}
                        >
                          <Send size={15} />
                        </button>
                      )}
                    </form>
                </>
              )}
              </div>
            ) : (
              <div className="p-4 text-center text-xs font-bold text-slate-400 bg-slate-100 border-t shrink-0">
                Atendimento resolvido e finalizado.
              </div>
            )}
          </>
        ) : conversations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 relative overflow-hidden min-h-[400px]">
            <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[150%] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm shrink-0 mb-4">
              <MessageSquare size={32} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Nenhum atendimento iniciado.</h2>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Conecte seu WhatsApp para começar.
            </p>
          </div>
        ) : (
          /* RICH TRIAGEM WORKSPACE DASHBOARD */
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {/* Hero Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[150%] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
              <div className="z-10">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-primary animate-pulse" />
                  <h2 className="text-lg font-bold text-slate-800">Central de Triagem HBFlow</h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Atendimento unificado. Escolha um chamado na lista ou monitore a fila de direcionamento automático.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-xl border border-emerald-100 text-[10.5px] z-10 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Sincronização em Tempo Real</span>
              </div>

            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Aguardando Triagem</span>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-slate-800">
                    {conversations.filter((c) => c.status === 'new').length}
                  </span>
                  <span className="text-[10px] text-slate-500">novos chamados</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ativos no Momento</span>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-slate-800">
                    {conversations.filter((c) => c.status === 'open').length}
                  </span>
                  <span className="text-[10px] text-slate-500">conversas abertas</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Urgência de SLA</span>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-rose-600">
                    {conversations.filter((c) => c.status !== 'closed' && isSlaBreached(c.slaLimitAt)).length}
                  </span>
                  <span className="text-[10px] text-rose-500 font-semibold">breaches ativos</span>
                </div>
              </div>
            </div>

            {/* Sub grids: SLA breaches & active agents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Section 1: SLAs Warning Monitor */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col h-[280px]">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b pb-2">
                  <AlertTriangle size={14} className="text-rose-500" />
                  Monitor de Alertas SLA Próximos do Limite
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2.5 text-xs">
                  {conversations.filter((c) => c.status !== 'closed' && c.slaLimitAt).length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Nenhum limite de SLA cadastrado no momento.</p>
                  ) : (
                    conversations
                      .filter((c) => c.status !== 'closed' && c.slaLimitAt)
                      .map((c) => {
                        const contactObj = contacts.find((ct) => ct.id === c.contactId);
                        const isOver = isSlaBreached(c.slaLimitAt);
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedConvId(c.id)}
                            className="p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-primary/5 transition-colors cursor-pointer flex justify-between items-center"
                          >
                            <div>
                              <strong className="text-slate-800 block">{contactObj?.name}</strong>
                              <span className="text-[10px] text-slate-400 mt-0.5 block">SLA: {new Date(c.slaLimitAt!).toLocaleTimeString()}</span>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isOver ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isOver ? 'Excedido' : 'Dentro do limite'}
                            </span>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Section 2: Agent workloads & state */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col h-[280px]">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b pb-2">
                  <UserCheck size={14} className="text-primary" />
                  Atendentes e Carga de Trabalho (Workloads)
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 text-xs">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-all bg-white dark:bg-slate-900/40">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20"
                          />
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-950 ${
                            user.presence === 'online' ? 'bg-emerald-500' :
                            user.presence === 'away' ? 'bg-amber-500' :
                            user.presence === 'lunch' ? 'bg-orange-500' :
                            user.presence === 'break' ? 'bg-purple-500' :
                            user.presence === 'meeting' ? 'bg-rose-500' : 'bg-slate-400'
                          }`} />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-100 block leading-tight">{user.name}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">{user.role}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-350 block">{user.workload} chamados</span>
                        <span className="text-[8.5px] text-slate-400 block">ocupação ativa</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Live routing logs console */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm h-[200px] flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-3 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Play size={12} className="text-primary animate-pulse" />
                Console de Roteamento Inteligente em Tempo Real
              </span>
              <div className="flex-1 overflow-y-auto font-mono text-[10.5px] text-slate-300 space-y-1.5">
                {routingLogs.length === 0 ? (
                  <div className="text-slate-500 italic">Aguardando eventos de roteamento em tempo real...</div>

                ) : (
                  routingLogs.map((log) => (
                    <div key={log.id}>
                      <span className="text-emerald-500">&gt;</span> [Roteamento] Novo cliente{' '}
                      <strong className="text-white">{log.contactName}</strong> direcionado para{' '}
                      <strong className="text-indigo-400">{log.departmentName || 'Fila Geral'}</strong>. Motivo:{' '}
                      <span className="text-slate-400 italic">{log.routingReason}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DIALOG MODALS */}

      {/* 1. Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-bold text-slate-800">Transferir Atendimento</h4>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Setor (Fila)</label>
                <select
                  value={transferTargetDept}
                  onChange={(e) => setTransferTargetDept(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary transition-all font-medium"
                >
                  <option value="">Fila Geral (Nenhum Setor)</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Responsável (Atendente)</label>
                <select
                  value={transferTargetUser}
                  onChange={(e) => setTransferTargetUser(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary transition-all font-medium"
                >
                  <option value="">Nenhum Atendente (Fila Geral)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={executeTransfer}
              className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Confirmar Transferência
            </button>
          </div>
        </div>
      )}

      {/* 2. Opportunity Modal */}
      {showOpportunityModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-bold text-slate-800">Vincular Oportunidade no CRM</h4>
              <button onClick={() => setShowOpportunityModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Vincule este cliente ao Pipeline de vendas e agende uma tarefa automática de follow-up.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Título do Negócio</label>
                <input
                  type="text"
                  placeholder="Ex: Compra Armação Ray-Ban"
                  value={oppTitle}
                  onChange={(e) => setOppTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary focus:bg-white transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Valor Estimado (R$)</label>
                  <input
                    type="number"
                    value={oppValue}
                    onChange={(e) => setOppValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary focus:bg-white transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Produtos de Interesse</label>
                  <input
                    type="text"
                    placeholder="Rayban Black"
                    value={oppProducts}
                    onChange={(e) => setOppProducts(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={executeCreateOpportunity}
              className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Criar Negócio no Kanban
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
