/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Trophy, 
  Target, 
  Zap, 
  Shield, 
  Clock, 
  User, 
  TrendingUp,
  Loader2,
  X,
  PlusCircle,
  BarChart3,
  Users,
  Map as MapIcon,
  ChevronRight,
  Trash2,
  Save,
  Activity,
  LayoutDashboard,
  History,
  Settings,
  CheckCircle2,
  FileText,
  Menu,
  Lock,
  LogIn,
  UserPlus,
  LogOut,
  Eye,
  EyeOff,
  Download,
  Database,
  Globe,
  Instagram,
  Twitter,
  Music2,
  MessageSquare,
  HelpCircle,
  CreditCard,
  Bell,
  Search,
  Filter,
  Calendar,
  MoreHorizontal,
  Share2,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  MousePointer2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';
import { analyzeFFScreenshot } from './services/geminiService';
import { FFMatchStats, Player, PlayerMatchStats, ScoringConfig } from './types';
import { cn } from './lib/utils';
import { generateMVPCard } from './utils/cardGenerator';

const DEFAULT_SCORING: ScoringConfig = {
  isStandardLBFF: true,
  killPoints: 1,
  placementPoints: {
    1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0
  }
};

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [credits, setCredits] = useState(100);

  const rechargeCredits = () => {
    setCredits(prev => prev + 100);
    alert('100 créditos adicionados com sucesso!');
  };

  const [step, setStep] = useState<'setup' | 'dashboard'>('setup');
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'players' | 'settings'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newNickname, setNewNickname] = useState('');
  const [matches, setMatches] = useState<FFMatchStats[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Scoring Config
  const [scoring, setScoring] = useState<ScoringConfig>(DEFAULT_SCORING);

  // Nickname Mapping State
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [pendingMatch, setPendingMatch] = useState<FFMatchStats | null>(null);
  const [unknownNicks, setUnknownNicks] = useState<string[]>([]);
  const [mappingInputs, setMappingInputs] = useState<Record<string, string>>({});
  const [callInput, setCallInput] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showTournamentManager, setShowTournamentManager] = useState(false);
  const [analysisQueue, setAnalysisQueue] = useState<FFMatchStats[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [isMetadataReady, setIsMetadataReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Match Metadata Form State
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [metadataInput, setMetadataInput] = useState({
    tournament: '',
    round: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Filter State
  const [filters, setFilters] = useState({
    tournament: 'all',
    round: 'all',
    map: 'all',
    dateRange: 'all'
  });

  const [playerView, setPlayerView] = useState<'overview' | 'deep'>('overview');

  // Load session from sessionStorage
  useEffect(() => {
    const timer = setTimeout(() => setIsSplashVisible(false), 3000);
    
    // Use sessionStorage for the session so it persists on refresh but clears on tab close
    const savedSession = sessionStorage.getItem('ff_session');
    if (savedSession) {
      setIsLoggedIn(true);
      setCurrentUser(savedSession);
    }
    
    return () => clearTimeout(timer);
  }, []);

  // Fetch data from server when user logs in
  useEffect(() => {
    const fetchData = async () => {
      if (isLoggedIn && currentUser) {
        setIsSyncing(true);
        try {
          const response = await fetch(`/api/data?email=${encodeURIComponent(currentUser)}`);
          if (response.ok) {
            const { matches: serverMatches, config: serverConfig } = await response.json();
            if (serverMatches) setMatches(serverMatches);
            if (serverConfig) {
              if (serverConfig.credits !== undefined) setCredits(serverConfig.credits);
              if (serverConfig.players) {
                const uniquePlayers = Array.from(new Map(serverConfig.players.map((p: any) => [p.id, p])).values()) as Player[];
                setPlayers(uniquePlayers);
                if (uniquePlayers.length > 0) setStep('dashboard');
              }
              if (serverConfig.mappings) setMappings(serverConfig.mappings);
              if (serverConfig.scoring) setScoring(serverConfig.scoring);
            }
          }
        } catch (err) {
          console.error("Failed to fetch data from server:", err);
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Load from local storage if not logged in
        const savedPlayers = localStorage.getItem('ff_players');
        const savedMatches = localStorage.getItem('ff_matches');
        const savedMappings = localStorage.getItem('ff_mappings');
        const savedScoring = localStorage.getItem('ff_scoring');
        const savedCredits = localStorage.getItem('ff_credits');

        if (savedPlayers) {
          const parsedPlayers = JSON.parse(savedPlayers);
          const uniquePlayers = Array.from(new Map(parsedPlayers.map((p: any) => [p.id, p])).values()) as Player[];
          setPlayers(uniquePlayers);
        }
        if (savedMatches) setMatches(JSON.parse(savedMatches));
        if (savedMappings) setMappings(JSON.parse(savedMappings));
        if (savedScoring) setScoring(JSON.parse(savedScoring));
        if (savedCredits) setCredits(parseInt(savedCredits, 10));
      }
    };

    fetchData();
  }, [isLoggedIn, currentUser]);

  // Save to Server
  const saveMatchToServer = async (match: FFMatchStats) => {
    if (isLoggedIn && currentUser) {
      try {
        await fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentUser, match })
        });
      } catch (err) {
        console.error("Failed to save match to server:", err);
      }
    }
  };

  const saveConfigToServer = async () => {
    if (isLoggedIn && currentUser) {
      try {
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: currentUser, 
            config: { players, mappings, scoring, credits } 
          })
        });
      } catch (err) {
        console.error("Failed to save config to server:", err);
      }
    }
  };

  const removeMatchFromServer = async (matchId: string) => {
    if (isLoggedIn && currentUser) {
      console.log(`Requesting server to remove match ${matchId} for ${currentUser}`);
      try {
        const response = await fetch(`/api/matches?email=${encodeURIComponent(currentUser)}&matchId=${encodeURIComponent(matchId)}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        console.log("Server response for match removal:", data);
      } catch (err) {
        console.error("Failed to remove match from server:", err);
      }
    }
  };

  const removeTournamentFromServer = async (tournament: string) => {
    if (isLoggedIn && currentUser) {
      const trimmedTournament = tournament.trim();
      console.log(`Requesting server to remove tournament "${trimmedTournament}" for ${currentUser}`);
      try {
        const response = await fetch(`/api/matches/tournament?email=${encodeURIComponent(currentUser)}&tournament=${encodeURIComponent(trimmedTournament)}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        console.log("Server response for tournament removal:", data);
      } catch (err) {
        console.error("Failed to remove tournament from server:", err);
      }
    }
  };

  const clearAllMatchesFromServer = async () => {
    if (isLoggedIn && currentUser) {
      console.log(`Requesting server to clear all matches for ${currentUser}`);
      try {
        const response = await fetch(`/api/matches/clear?email=${encodeURIComponent(currentUser)}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        console.log("Server response for clearing matches:", data);
        
        // Clear local state immediately
        setMatches([]);
        localStorage.removeItem('ff_matches');
      } catch (err) {
        console.error("Failed to clear matches from server:", err);
      }
    } else {
      // Not logged in, just clear local
      setMatches([]);
      localStorage.removeItem('ff_matches');
    }
  };

  // Save to localStorage and Server (via effects)
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      sessionStorage.setItem('ff_session', currentUser);
    } else {
      sessionStorage.removeItem('ff_session');
    }
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    localStorage.setItem('ff_players', JSON.stringify(players));
    if (!isSyncing) saveConfigToServer();
  }, [players]);

  useEffect(() => {
    localStorage.setItem('ff_matches', JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem('ff_mappings', JSON.stringify(mappings));
    if (!isSyncing) saveConfigToServer();
  }, [mappings]);

  useEffect(() => {
    localStorage.setItem('ff_scoring', JSON.stringify(scoring));
    if (!isSyncing) saveConfigToServer();
  }, [scoring]);

  useEffect(() => {
    localStorage.setItem('ff_credits', credits.toString());
    if (!isSyncing) saveConfigToServer();
  }, [credits]);

  const addPlayer = () => {
    const trimmed = newNickname.trim();
    if (!trimmed) return;
    
    // Prevent duplicate nicknames
    if (players.some(p => p.nickname.toLowerCase() === trimmed.toLowerCase())) {
      setError("Este jogador já está cadastrado.");
      return;
    }

    const player: Player = {
      id: crypto.randomUUID(),
      nickname: trimmed
    };
    setPlayers(prev => {
      const exists = prev.some(p => p.nickname.toLowerCase() === trimmed.toLowerCase());
      if (exists) return prev;
      return [...prev, player];
    });
    setNewNickname('');
    setError(null);
  };

  const removePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const startDashboard = () => {
    setStep('dashboard');
  };

  const mergeMatchStats = (base: FFMatchStats, extra: FFMatchStats): FFMatchStats => {
    const normalize = (s: string) => s.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    
    const mergedPlayers = [...base.players];
    extra.players.forEach(ep => {
      const normEP = normalize(ep.playerName);
      const existingIdx = mergedPlayers.findIndex(p => normalize(p.playerName) === normEP);
      if (existingIdx >= 0) {
        const p = mergedPlayers[existingIdx];
        const merged = { ...p };
        (Object.keys(ep) as Array<keyof PlayerMatchStats>).forEach(key => {
          const val = ep[key];
          if (val !== 0 && val !== null && val !== undefined && val !== '0%' && val !== '') {
            (merged as any)[key] = val;
          }
        });
        mergedPlayers[existingIdx] = merged;
      } else {
        mergedPlayers.push(ep);
      }
    });

    const getSourceType = (stats: FFMatchStats): 'normal' | 'detalhado' => {
      const hasDetailedMetrics = stats.players.some(p => 
        (p.knockdowns && p.knockdowns > 0) || 
        (p.healing && p.healing > 0) || 
        (p.survivalTime && p.survivalTime !== '00:00')
      );
      return hasDetailedMetrics ? 'detalhado' : 'normal';
    };

    const baseType = getSourceType(base);
    const extraType = getSourceType(extra);
    const sourceTypes = Array.from(new Set([...(base.sourceTypes || [baseType]), extraType]));
    
    return { 
      ...base, 
      players: mergedPlayers,
      map: base.map || extra.map,
      placement: base.placement || extra.placement,
      sourceCount: (base.sourceCount || 1) + 1,
      sourceTypes: sourceTypes as ('normal' | 'detalhado')[]
    };
  };

  const isSameMatch = (a: FFMatchStats, b: FFMatchStats): boolean => {
    const normalize = (s: string) => s.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    
    const normMapA = normalize(a.map);
    const normMapB = normalize(b.map);
    const sameMap = normMapA === normMapB || normMapA === '' || normMapB === '';
    const samePlacement = a.placement === b.placement || a.placement === 0 || b.placement === 0;

    const playersA = a.players.map(p => normalize(p.playerName)).filter(n => n.length > 2);
    const playersB = b.players.map(p => normalize(p.playerName)).filter(n => n.length > 2);
    const commonPlayers = playersA.filter(p => playersB.includes(p));

    const totalDamageA = a.players.reduce((sum, p) => sum + (p.damage || 0), 0);
    const totalDamageB = b.players.reduce((sum, p) => sum + (p.damage || 0), 0);
    const sameDamage = totalDamageA > 0 && totalDamageB > 0 && totalDamageA === totalDamageB;

    // Strong match: Map + Placement + (Players OR Damage)
    if (sameMap && samePlacement && (commonPlayers.length >= 2 || sameDamage)) return true;
    
    // Very strong match: 3+ Players + Damage (even if map/placement misread)
    if (commonPlayers.length >= 3 && sameDamage) return true;

    // Identical damage and at least 2 players (very likely same match)
    if (sameDamage && commonPlayers.length >= 2) return true;

    return false;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    if (credits < acceptedFiles.length) {
      setError(`Créditos insuficientes. Você tem ${credits} créditos, mas tentou processar ${acceptedFiles.length} imagens.`);
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: acceptedFiles.length });
    setIsMetadataReady(false); // Reset metadata readiness for new batch
    setShowMetadataForm(true); // Show form immediately for the batch
    
    const normalizedStats: FFMatchStats[] = [];

    try {
      // Process in small batches (2 at a time) to ensure accuracy and avoid rate limits
      const batchSize = 2;
      for (let i = 0; i < acceptedFiles.length; i += batchSize) {
        const batch = acceptedFiles.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(async (file) => {
          const base64 = await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result as string);
            r.readAsDataURL(file);
          });

          const stats = await analyzeFFScreenshot(base64);
          
          // Deduct credit for each successful analysis
          setCredits(prev => Math.max(0, prev - 1));

          const normalized: FFMatchStats = {
            ...stats,
            players: stats.players.map(p => ({
              ...p,
              playerName: p.playerName.trim().replace(/\s+/g, ' ')
            }))
          };
          
          setAnalysisProgress(prev => ({ ...prev, current: prev.current + 1 }));
          return normalized;
        }));
        normalizedStats.push(...batchResults);
      }

      // Merge duplicates in the current batch (same match detection)
      const mergedBatch: FFMatchStats[] = [];
      normalizedStats.forEach(stat => {
        const existing = mergedBatch.find(m => isSameMatch(m, stat));
        if (existing) {
          const idx = mergedBatch.indexOf(existing);
          mergedBatch[idx] = mergeMatchStats(existing, stat);
        } else {
          mergedBatch.push(stat);
        }
      });

      setAnalysisQueue(prev => [...prev, ...mergedBatch]);
    } catch (err) {
      console.error(err);
      setError("Falha ao analisar uma ou mais imagens. Verifique se são prints válidos do Free Fire.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [players]);

  // Effect to handle the queue
  useEffect(() => {
    // Only proceed if we have items in queue AND metadata is confirmed
    if (analysisQueue.length > 0 && isMetadataReady && !pendingMatch && !unknownNicks.length) {
      const nextMatch = analysisQueue[0];
      const normalize = (s: string) => s.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
      const uniqueNames = Array.from(new Set(nextMatch.players.map(p => p.playerName)));
      
      const unknown = uniqueNames.filter(name => {
        const normName = normalize(name);
        if (normName.length < 2) return false;
        const noise = ['OK', 'VOLTAR', 'SQUAD', 'BOOYAH', 'MAPA', 'RESUMO', 'DETALHES', 'COMPARTILHAR'];
        if (noise.includes(normName)) return false;
        const mappingKey = Object.keys(mappings).find(m => normalize(m) === normName);
        if (mappingKey) {
          const mappedValue = mappings[mappingKey];
          if (mappedValue === '__IGNORE__') return false;
          return false;
        }
        const isSquad = players.some(pl => normalize(pl.nickname) === normName);
        if (isSquad) return false;
        return true;
      });

      if (unknown.length > 0 || !nextMatch.call) {
        setUnknownNicks(unknown);
        setPendingMatch(nextMatch);
        setCallInput(''); // Reset call input for new match
        const initialInputs: Record<string, string> = {};
        unknown.forEach(name => {
          const normName = normalize(name);
          const suggestion = players.find(pl => normName.includes(normalize(pl.nickname)))?.nickname || name;
          initialInputs[name] = suggestion;
        });
        setMappingInputs(initialInputs);
      } else {
        // Auto-save with batch metadata (only if call is already present, which shouldn't happen with fresh analysis)
        const mappedStats = applyMappings(nextMatch, mappings);
        const finalMatch: FFMatchStats = {
          ...mappedStats,
          id: crypto.randomUUID(),
          tournament: metadataInput.tournament || 'Geral',
          round: metadataInput.round || '1',
          date: metadataInput.date,
          call: nextMatch.call
        };
        setMatches(prev => [finalMatch, ...prev]);
        saveMatchToServer(finalMatch);
      }
      
      setAnalysisQueue(prev => prev.slice(1));
    }
  }, [analysisQueue, isMetadataReady, pendingMatch, unknownNicks, mappings, players, metadataInput, scoring]);

  const applyMappings = (stats: FFMatchStats, currentMappings: Record<string, string>): FFMatchStats => {
    const normalize = (s: string) => s.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    
    // Calculate Score for each player
    // Squad Score = Placement Points + (Total Squad Kills * Kill Points)
    // We only count kills for players that are in our squad list and NOT ignored
    const placementPts = scoring.placementPoints[stats.placement] || 0;
    
    const squadKills = stats.players.reduce((acc, p) => {
      const normP = normalize(p.playerName);
      
      // Check if it's a direct squad member
      const isDirectSquad = players.some(pl => normalize(pl.nickname) === normP);
      if (isDirectSquad) return acc + p.kills;

      // Check if it's a mapped squad member
      const mappingKey = Object.keys(currentMappings).find(m => normalize(m) === normP);
      if (mappingKey) {
        const friendlyName = currentMappings[mappingKey];
        if (friendlyName === '__IGNORE__') return acc; // Skip ignored names
        const isMappedSquad = players.some(pl => normalize(pl.nickname) === normalize(friendlyName));
        if (isMappedSquad) return acc + p.kills;
      }

      return acc;
    }, 0);

    const squadScore = placementPts + (squadKills * scoring.killPoints);

    return {
      ...stats,
      players: stats.players
        .map(p => {
          const normP = normalize(p.playerName);
          const mappingKey = Object.keys(currentMappings).find(m => normalize(m) === normP);
          const mappedName = mappingKey ? currentMappings[mappingKey] : p.playerName;
          
          if (mappedName === '__IGNORE__') return null;

          const squadMember = players.find(pl => normalize(pl.nickname) === normP);
          
          return {
            ...p,
            playerName: mappedName || (squadMember ? squadMember.nickname : p.playerName),
            score: squadScore
          };
        })
        .filter((p): p is PlayerMatchStats => p !== null)
    };
  };

  const saveMappings = () => {
    const cleanedInputs: Record<string, string> = {};
    const newPlayersToAdd: Player[] = [];

    Object.entries(mappingInputs).forEach(([raw, friendly]) => {
      const trimmedFriendly = friendly.trim();
      cleanedInputs[raw] = trimmedFriendly;

      if (trimmedFriendly && trimmedFriendly !== '__IGNORE__') {
        const exists = players.some(p => p.nickname.toLowerCase() === trimmedFriendly.toLowerCase()) || 
                       newPlayersToAdd.some(p => p.nickname.toLowerCase() === trimmedFriendly.toLowerCase());
        
        if (!exists) {
          newPlayersToAdd.push({
            id: Math.random().toString(36).substr(2, 9),
            nickname: trimmedFriendly
          });
        }
      }
    });

    if (newPlayersToAdd.length > 0) {
      setPlayers(prev => [...prev, ...newPlayersToAdd]);
    }

    const newMappings = { ...mappings, ...cleanedInputs };
    setMappings(newMappings);
    
    // Auto-save with batch metadata after mapping
    if (pendingMatch) {
      const mappedStats = applyMappings(pendingMatch, newMappings);
      const finalMatch: FFMatchStats = {
        ...mappedStats,
        id: crypto.randomUUID(),
        tournament: metadataInput.tournament || 'Geral',
        round: metadataInput.round || '1',
        date: metadataInput.date,
        call: callInput.trim() || 'Desconhecido'
      };
      setMatches(prev => [finalMatch, ...prev]);
      saveMatchToServer(finalMatch);
    }
    
    setPendingMatch(null);
    setUnknownNicks([]);
    setMappingInputs({});
    setCallInput('');
    setActiveDropdown(null);
  };

  const saveBatchMetadata = () => {
    setIsMetadataReady(true);
    setShowMetadataForm(false);
  };

  const removeMatch = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta partida?')) {
      setMatches(prev => prev.filter(m => m.id !== id));
      removeMatchFromServer(id);
    }
  };

  const removeTournament = (tournamentName: string) => {
    if (confirm(`Tem certeza que deseja excluir TODAS as partidas do campeonato "${tournamentName}"? Esta ação não pode ser desfeita.`)) {
      const trimmedName = tournamentName.trim();
      setMatches(prev => prev.filter(m => (m.tournament || '').trim() !== trimmedName));
      removeTournamentFromServer(trimmedName);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    multiple: true,
    disabled: isAnalyzing || showMetadataForm || pendingMatch !== null
  });

  // Filtered Matches
  const filteredMatches = matches.filter(m => {
    const tournamentMatch = filters.tournament === 'all' || (m.tournament || '').trim() === (filters.tournament || '').trim();
    const roundMatch = filters.round === 'all' || m.round === filters.round;
    const mapMatch = filters.map === 'all' || m.map === filters.map;
    
    let dateMatch = true;
    if (filters.dateRange !== 'all') {
      const matchDate = new Date(m.date + 'T00:00:00');
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (filters.dateRange === '7d') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        dateMatch = matchDate >= sevenDaysAgo;
      } else if (filters.dateRange === '30d') {
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateMatch = matchDate >= firstDayOfMonth;
      }
    }
    
    return tournamentMatch && roundMatch && mapMatch && dateMatch;
  });

    // Calculate aggregated stats for all players
    const playerStats = players.map(player => {
      const playerMatches = filteredMatches.flatMap(m => m.players.filter(p => p.playerName.toLowerCase() === player.nickname.toLowerCase()));
      const matchCount = playerMatches.length;
      const totalKills = playerMatches.reduce((acc, m) => acc + (m.kills || 0), 0);
      const totalDamage = playerMatches.reduce((acc, m) => acc + (m.damage || 0), 0);
      const totalAssists = playerMatches.reduce((acc, m) => acc + (m.assists || 0), 0);
      
      // Helper to parse survival time "MM:SS" to seconds
      const timeToSeconds = (time: string | undefined) => {
        if (!time) return 0;
        const parts = time.split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
      };

      const totalSurvivalSeconds = playerMatches.reduce((acc, m) => acc + timeToSeconds(m.survivalTime), 0);
      const totalKnockdowns = playerMatches.reduce((acc, m) => acc + (m.knockdowns || 0), 0);
      const totalHealing = playerMatches.reduce((acc, m) => acc + (m.healing || 0), 0);
      const totalRevives = playerMatches.reduce((acc, m) => acc + (m.revives || 0), 0);
      const totalRespawns = playerMatches.reduce((acc, m) => acc + (m.respawns || 0), 0);
      
      // Squad totals for participation metrics
      const squadTotalKills = filteredMatches.reduce((acc, m) => acc + m.players.reduce((pAcc, p) => pAcc + p.kills, 0), 0);
      const squadTotalDamage = filteredMatches.reduce((acc, m) => acc + m.players.reduce((pAcc, p) => pAcc + p.damage, 0), 0);

      // New Metrics Calculations
      const participationRate = squadTotalKills > 0 ? (((totalKills + totalAssists) / squadTotalKills) * 100).toFixed(1) : '0.0';
      const damagePerMinute = totalSurvivalSeconds > 0 ? (totalDamage / (totalSurvivalSeconds / 60)).toFixed(1) : '0.0';
      const supportIndex = (totalAssists * 1.5 + totalRespawns * 2.0).toFixed(1);
      const combatEfficiency = totalKills > 0 ? (totalDamage / totalKills).toFixed(0) : '0';

      // Map performance
      const mapStats: Record<string, { kills: number, count: number }> = {};
      playerMatches.forEach(m => {
        const match = filteredMatches.find(fm => fm.players.some(p => p.playerName.toLowerCase() === player.nickname.toLowerCase() && p.kills === m.kills && p.damage === m.damage));
        if (match) {
          if (!mapStats[match.map]) mapStats[match.map] = { kills: 0, count: 0 };
          mapStats[match.map].kills += m.kills;
          mapStats[match.map].count += 1;
        }
      });

      let bestMap = 'N/A';
      let maxAvgKills = -1;
      Object.entries(mapStats).forEach(([map, stats]) => {
        const avg = stats.kills / stats.count;
        if (avg > maxAvgKills) {
          maxAvgKills = avg;
          bestMap = map;
        }
      });
      
      return {
        ...player,
        totalKills,
        totalDamage,
        totalAssists,
        totalScore: playerMatches.reduce((acc, m) => acc + (m.score || 0), 0),
        matchCount,
        avgKills: matchCount > 0 ? (totalKills / matchCount).toFixed(2) : '0.00',
        avgDamage: matchCount > 0 ? Math.round(totalDamage / matchCount) : 0,
        avgSurvival: matchCount > 0 ? Math.round(totalSurvivalSeconds / matchCount) : 0,
        totalKnockdowns,
        totalHealing,
        totalRevives,
        totalRespawns,
        avgHeadshot: playerMatches.length > 0 ? (playerMatches.reduce((acc, m) => acc + parseFloat(m.headshotPercentage || '0'), 0) / playerMatches.length).toFixed(1) : '0.0',
        damagePerKill: totalKills > 0 ? Math.round(totalDamage / totalKills) : 0,
        killParticipation: squadTotalKills > 0 ? ((totalKills / squadTotalKills) * 100).toFixed(1) : '0.0',
        damageShare: squadTotalDamage > 0 ? ((totalDamage / squadTotalDamage) * 100).toFixed(1) : '0.0',
        participationRate,
        damagePerMinute,
        supportIndex,
        combatEfficiency,
        bestMap,
        radarData: [
          { subject: 'Letalidade', value: Math.min(100, (totalKills / Math.max(1, matchCount)) * 20 + (totalDamage / Math.max(1, totalKills || 1) / 10)) },
          { subject: 'Sobrevivência', value: Math.min(100, (totalSurvivalSeconds / Math.max(1, matchCount) / 1020) * 100) },
          { subject: 'Suporte', value: Math.min(100, ((totalAssists * 1.5 + totalRevives * 2) / Math.max(1, matchCount)) * 15) },
          { subject: 'Precisão', value: parseFloat(playerMatches.length > 0 ? (playerMatches.reduce((acc, m) => acc + parseFloat(m.headshotPercentage || '0'), 0) / playerMatches.length).toFixed(1) : '0.0') },
          { subject: 'Consistência', value: Math.min(100, (playerMatches.reduce((acc, m) => acc + (m.score || 0), 0) / Math.max(1, matchCount)) * 8) }
        ]
      };
    });

  // Global Squad Stats
  const squadStats = {
    totalMatches: filteredMatches.length,
    booyahs: filteredMatches.filter(m => m.placement === 1).length,
    top3: filteredMatches.filter(m => m.placement <= 3).length,
    top5: filteredMatches.filter(m => m.placement <= 5).length,
    avgPlacement: filteredMatches.length > 0 ? (filteredMatches.reduce((acc, m) => acc + m.placement, 0) / filteredMatches.length).toFixed(1) : '0.0',
    avgPoints: filteredMatches.length > 0 ? (filteredMatches.reduce((acc, m) => acc + (m.players[0]?.score || 0), 0) / filteredMatches.length).toFixed(1) : '0.0',
    totalKills: filteredMatches.reduce((acc, m) => acc + m.players.reduce((pAcc, p) => pAcc + p.kills, 0), 0),
    totalDamage: filteredMatches.reduce((acc, m) => acc + m.players.reduce((pAcc, p) => pAcc + p.damage, 0), 0),
    avgKillsPerMatch: filteredMatches.length > 0 ? (filteredMatches.reduce((acc, m) => acc + m.players.reduce((pAcc, p) => pAcc + p.kills, 0), 0) / filteredMatches.length).toFixed(1) : '0.0',
    bestSquadMap: (() => {
      const mapPlacements: Record<string, { sum: number, count: number }> = {};
      filteredMatches.forEach(m => {
        if (!mapPlacements[m.map]) mapPlacements[m.map] = { sum: 0, count: 0 };
        mapPlacements[m.map].sum += m.placement;
        mapPlacements[m.map].count += 1;
      });
      let best = 'N/A';
      let minAvg = 999;
      Object.entries(mapPlacements).forEach(([map, stats]) => {
        const avg = stats.sum / stats.count;
        if (avg < minAvg) {
          minAvg = avg;
          best = map;
        }
      });
      return best;
    })(),
    lethality: filteredMatches.length > 0 ? (filteredMatches.reduce((acc, m) => acc + m.players.reduce((pAcc, p) => pAcc + p.damage, 0), 0) / filteredMatches.reduce((acc, m) => acc + m.players.reduce((pAcc, p) => pAcc + p.kills, 0), 1)).toFixed(0) : '0',
    totalPoints: filteredMatches.reduce((acc, m) => acc + (m.players[0]?.score || 0), 0)
  };

  const callStats = (() => {
    const stats: Record<string, { 
      call: string, 
      map: string, 
      count: number, 
      totalPoints: number, 
      totalKills: number, 
      totalPlacement: number,
      booyahs: number
    }> = {};

    filteredMatches.forEach(m => {
      const key = `${m.map}-${m.call || 'Desconhecido'}`;
      if (!stats[key]) {
        stats[key] = { 
          call: m.call || 'Desconhecido', 
          map: m.map, 
          count: 0, 
          totalPoints: 0, 
          totalKills: 0, 
          totalPlacement: 0,
          booyahs: 0
        };
      }
      stats[key].count += 1;
      stats[key].totalPoints += m.players[0]?.score || 0;
      stats[key].totalKills += m.players.reduce((acc, p) => acc + p.kills, 0);
      stats[key].totalPlacement += m.placement;
      if (m.placement === 1) stats[key].booyahs += 1;
    });

    return Object.values(stats).map(s => ({
      ...s,
      avgPoints: (s.totalPoints / s.count).toFixed(1),
      avgKills: (s.totalKills / s.count).toFixed(1),
      avgPlacement: (s.totalPlacement / s.count).toFixed(1),
      winRate: ((s.booyahs / s.count) * 100).toFixed(1)
    })).sort((a, b) => parseFloat(b.avgPoints) - parseFloat(a.avgPoints));
  })();

  const tournaments = Array.from(new Set(matches.map(m => m.tournament).filter(Boolean))) as string[];
  const rounds = Array.from(new Set(matches.map(m => m.round)));
  const maps = Array.from(new Set(matches.map(m => m.map)));

  const [chartMetric, setChartMetric] = useState<'kills' | 'damage'>('kills');
  const [chartViewMode, setChartViewMode] = useState<'individual' | 'total'>('individual');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!authForm.username || !authForm.password) {
      setError("Preencha todos os campos.");
      return;
    }

    try {
      const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      const data = await response.json();

      if (response.ok) {
        setIsLoggedIn(true);
        setCurrentUser(authForm.username);
      } else {
        setError(data.error || "Erro na autenticação.");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Erro ao conectar com o servidor.");
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setMatches([]);
    setPlayers([]);
    setMappings({});
    setStep('setup');
    setActiveTab('overview');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FF Stats Pro - Meu Perfil',
          text: `Confira minhas estatísticas no FF Stats Pro! Usuário: ${currentUser}`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  if (isSplashVisible) {
    return (
      <div className="fixed inset-0 z-[100] bg-ff-dark flex flex-col items-center justify-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative"
        >
          <div className="w-32 h-32 bg-ff-orange rounded-3xl flex items-center justify-center neon-glow animate-float">
            <Trophy className="w-16 h-16 text-white" />
          </div>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute -bottom-12 left-0 h-1 bg-ff-orange rounded-full shadow-[0_0_10px_#ff6b00]"
          />
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-20 text-center"
        >
          <h1 className="text-4xl font-display font-black uppercase tracking-tight neon-text">FF Stats Pro</h1>
          <p className="text-white/30 font-mono uppercase tracking-[0.3em] mt-2 text-xs">Advanced Analytics Engine</p>
        </motion.div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-ff-dark flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-ff-orange/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-ff-orange/5 blur-[120px] rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="glass-card p-10 space-y-8 border-white/10 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-ff-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-ff-orange" />
              </div>
              <h2 className="text-3xl font-display font-black uppercase tracking-tight">
                {authMode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
              </h2>
              <p className="text-white/40 text-sm">
                {authMode === 'login' ? 'Acesse sua conta para gerenciar seu squad' : 'Comece a trackear o desempenho do seu time'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-white/40 tracking-widest font-bold ml-1">Usuário</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type="text" 
                      value={authForm.username}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Seu nickname..."
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-ff-orange transition-all font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-white/40 tracking-widest font-bold ml-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={authForm.password}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-12 py-4 focus:outline-none focus:border-ff-orange transition-all font-medium"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-ff-red/10 border border-ff-red/20 rounded-xl text-ff-red text-xs font-bold flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  {error}
                </motion.div>
              )}

              <button 
                type="submit"
                className="w-full bg-ff-orange hover:bg-ff-orange/80 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-ff-orange/20 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                {authMode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            </form>

            <div className="pt-6 border-t border-white/5 text-center">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-xs text-white/40 hover:text-ff-orange transition-colors"
              >
                {authMode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isLoggedIn && isSyncing && step === 'setup') {
    return (
      <div className="min-h-screen bg-ff-dark flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-ff-orange animate-spin mb-4" />
        <p className="text-white/40 font-mono uppercase tracking-widest text-xs">Sincronizando dados...</p>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-ff-dark text-white flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full glass-card p-8 space-y-8"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-ff-orange rounded-2xl flex items-center justify-center neon-glow mx-auto mb-4">
              <Users className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-display font-extrabold tracking-tight neon-text uppercase">
              Configurar <span className="text-ff-orange">Squad</span>
            </h1>
            <p className="text-white/50 text-sm mt-2">Defina os nicks e as regras de pontuação.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Players Setup */}
            <div className="space-y-4">
              <h2 className="text-sm font-mono text-ff-orange uppercase tracking-widest border-b border-white/10 pb-2">Jogadores</h2>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                  placeholder="Ex: Nobru, Cerol..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-ff-orange transition-colors text-sm"
                />
                <button 
                  onClick={addPlayer}
                  className="bg-ff-orange hover:bg-ff-orange/80 text-white font-bold px-4 py-3 rounded-xl transition-all flex items-center gap-2"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence>
                  {players.map((player) => (
                    <motion.div 
                      key={player.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-ff-orange" />
                        <span className="font-medium text-sm">{player.nickname}</span>
                      </div>
                      <button 
                        onClick={() => removePlayer(player.id)}
                        className="text-white/20 hover:text-ff-red transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Scoring Setup */}
            <div className="space-y-4">
              <h2 className="text-sm font-mono text-ff-orange uppercase tracking-widest border-b border-white/10 pb-2">Pontuação</h2>
              
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-xs font-medium">Padrão LBFF</span>
                <button 
                  onClick={() => setScoring(prev => ({ ...DEFAULT_SCORING, isStandardLBFF: !prev.isStandardLBFF }))}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    scoring.isStandardLBFF ? "bg-ff-orange" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    scoring.isStandardLBFF ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              {!scoring.isStandardLBFF && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40 uppercase">Pontos por Kill</span>
                    <input 
                      type="number"
                      value={scoring.killPoints}
                      onChange={(e) => setScoring(prev => ({ ...prev, killPoints: parseInt(e.target.value) || 0 }))}
                      className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-center text-sm focus:border-ff-orange outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(pos => (
                      <div key={pos} className="flex flex-col gap-1">
                        <span className="text-[8px] text-white/40 uppercase text-center">Top {pos}</span>
                        <input 
                          type="number"
                          value={scoring.placementPoints[pos]}
                          onChange={(e) => setScoring(prev => ({ 
                            ...prev, 
                            placementPoints: { ...prev.placementPoints, [pos]: parseInt(e.target.value) || 0 } 
                          }))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg py-1 text-center text-xs focus:border-ff-orange outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {scoring.isStandardLBFF && (
                <div className="p-3 bg-ff-orange/5 border border-ff-orange/20 rounded-xl text-[10px] text-white/60 leading-relaxed">
                  <p className="font-bold text-ff-orange mb-1 uppercase">Regras LBFF:</p>
                  <p>1º: 12 | 2º: 9 | 3º: 8 | 4º: 7 | 5º: 6 | 6º: 5 | 7º: 4 | 8º: 3 | 9º: 2 | 10º: 1 | 11-12º: 0</p>
                  <p className="mt-1">Kills: 1 ponto cada</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="text-ff-red text-xs text-center">{error}</p>
          )}

          <button 
            onClick={startDashboard}
            className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            Confirmar e Começar
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ff-dark text-white flex font-sans overflow-hidden">
      {/* Vertical Icon Rail (Far Left) */}
      <div className="w-[60px] h-screen bg-[#050505] border-r border-white/5 flex flex-col items-center py-6 gap-6 z-50 shrink-0">
        <div className="w-10 h-10 bg-ff-accent/20 rounded-xl flex items-center justify-center neon-glow-sm mb-4">
          <Globe className="w-5 h-5 text-ff-accent" />
        </div>
        <div className="flex flex-col gap-4 items-center opacity-40">
          <Instagram className="w-4 h-4 hover:text-ff-accent cursor-pointer transition-colors" />
          <Twitter className="w-4 h-4 hover:text-ff-accent cursor-pointer transition-colors" />
          <Music2 className="w-4 h-4 hover:text-ff-accent cursor-pointer transition-colors" />
          <MessageSquare className="w-4 h-4 hover:text-ff-accent cursor-pointer transition-colors" />
        </div>
        <div className="mt-auto flex flex-col gap-4 items-center opacity-40 pb-4">
          <HelpCircle className="w-4 h-4 hover:text-ff-accent cursor-pointer transition-colors" />
          <Settings className="w-4 h-4 hover:text-ff-accent cursor-pointer transition-colors" />
        </div>
      </div>

      {/* Sidebar Navigation */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 240 : 0 }}
        className="h-screen bg-[#0a0a0a] border-r border-white/5 flex flex-col relative z-40 transition-all overflow-hidden shrink-0"
      >
        <div className="p-8 flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-ff-accent/10 rounded-2xl flex items-center justify-center neon-glow mb-2">
            <Trophy className="text-ff-accent w-8 h-8" />
          </div>
          <h1 className="text-sm font-display font-black tracking-widest uppercase text-center">
            JOHN79 ANALISES <br/>
            <span className="text-[10px] text-ff-accent font-display font-bold tracking-widest">CONTROLANDO SEU TIME</span> <br/>
            <span className="text-[8px] text-white/40 font-mono tracking-[0.3em]">Rastreando sua vitória</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <SidebarItem 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Dashboard" 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
            collapsed={false}
          />
          <SidebarItem 
            icon={<Users className="w-4 h-4" />} 
            label="Contas" 
            active={activeTab === 'players'} 
            onClick={() => setActiveTab('players')}
            collapsed={false}
          />
          <SidebarItem 
            icon={<TrendingUp className="w-4 h-4" />} 
            label="Análise" 
            active={activeTab === 'matches'} 
            onClick={() => setActiveTab('matches')}
            collapsed={false}
          />
        </nav>

        <div className="p-6 space-y-4">
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full py-3 bg-gradient-to-r from-ff-accent to-ff-secondary text-black font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-ff-accent/20 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <PlusCircle className="w-4 h-4" />
            Inserir Dados
          </button>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <button 
              onClick={() => window.open('https://www.instagram.com/john79ff/', '_blank')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 text-[10px] font-mono uppercase tracking-widest text-white/60 hover:text-white transition-colors group"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4" />
                Suporte Técnico
              </div>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
            </button>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 p-3 text-[10px] font-mono uppercase tracking-widest text-ff-red/60 hover:text-ff-red transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>
          </div>
          <div className="text-center">
            <p className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Created by @john79ff</p>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#050505]">
        {/* Header / Top Bar */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505] shrink-0 z-30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
              <LayoutDashboard className="w-3 h-3" />
              <span>Controle</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-ff-accent font-bold">Visão Geral</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
              {['7 Dias', 'Este Mês', 'Todos'].map((label) => (
                <button 
                  key={label}
                  onClick={() => setFilters(prev => ({ ...prev, dateRange: label === '7 Dias' ? '7d' : label === 'Este Mês' ? '30d' : 'all' }))}
                  className={cn(
                    "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
                    (filters.dateRange === '7d' && label === '7 Dias') || (filters.dateRange === '30d' && label === 'Este Mês') || (filters.dateRange === 'all' && label === 'Todos')
                      ? "bg-ff-accent text-black shadow-lg shadow-ff-accent/20"
                      : "text-white/40 hover:text-white"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative group">
                <select 
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="appearance-none flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[9px] font-mono uppercase tracking-widest text-white/60 focus:outline-none focus:border-ff-accent/30 cursor-pointer pr-8"
                >
                  <option value="all" className="bg-ff-dark">Todas as Datas</option>
                  <option value="7d" className="bg-ff-dark">Últimos 7 Dias</option>
                  <option value="30d" className="bg-ff-dark">Este Mês</option>
                </select>
                <ChevronRight className="w-3 h-3 rotate-90 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/20" />
              </div>

              <div className="relative group">
                <select 
                  value={filters.tournament}
                  onChange={(e) => setFilters(prev => ({ ...prev, tournament: e.target.value }))}
                  className="appearance-none flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[9px] font-mono uppercase tracking-widest text-white/60 focus:outline-none focus:border-ff-accent/30 cursor-pointer pr-8"
                >
                  <option value="all" className="bg-ff-dark">Todos Campeonatos</option>
                  {tournaments.map(t => (
                    <option key={t} value={t} className="bg-ff-dark">{t}</option>
                  ))}
                </select>
                <ChevronRight className="w-3 h-3 rotate-90 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/20" />
              </div>
            </div>

          <div className="flex items-center gap-4 pl-4 border-l border-white/10">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono uppercase text-white/40 tracking-widest">{currentUser}</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-white uppercase tracking-tight">Créditos: <span className="text-ff-accent">{credits}</span></span>
                <button 
                  onClick={rechargeCredits}
                  className="text-[7px] font-black text-ff-accent hover:underline"
                >
                  [RECARREGAR]
                </button>
              </div>
            </div>
            <button 
              onClick={handleShare}
              className="p-2 bg-white/5 border border-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-ff-accent flex items-center justify-center text-black font-black text-xs shadow-lg shadow-ff-accent/20">
              {currentUser?.[0].toUpperCase()}
            </div>
          </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#050505]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-[1600px] mx-auto space-y-8"
            >
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Hero Cards Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <div className="glass-card p-6 group relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-ff-accent/10 rounded-xl text-ff-accent neon-icon">
                          <Target className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-mono uppercase text-white/20 tracking-widest font-bold bg-white/5 px-2 py-1 rounded-md">
                          {filteredMatches.length} Registros
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-4xl font-display font-black text-white value-glow">{squadStats.totalKills}</p>
                        <p className="text-[10px] font-mono uppercase text-white/40 tracking-widest">Total de Kills</p>
                      </div>
                    </div>

                    <div className="glass-card p-6 group relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-ff-secondary/10 rounded-xl text-ff-secondary neon-icon">
                          <Activity className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-mono uppercase text-white/20 tracking-widest font-bold bg-white/5 px-2 py-1 rounded-md">
                          AVG: {Math.round(squadStats.totalDamage / (squadStats.totalMatches || 1))}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-4xl font-display font-black text-white value-glow">{squadStats.totalPoints}</p>
                        <p className="text-[10px] font-mono uppercase text-white/40 tracking-widest">Pontuação Total</p>
                      </div>
                    </div>

                    <div className="glass-card p-6 group relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-ff-accent/10 rounded-xl text-ff-accent neon-icon">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-mono uppercase text-white/20 tracking-widest font-bold bg-white/5 px-2 py-1 rounded-md">
                          {squadStats.totalMatches > 0 ? ((squadStats.booyahs / squadStats.totalMatches) * 100).toFixed(0) : 0}% Win Rate
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-4xl font-display font-black text-white value-glow">{squadStats.booyahs}</p>
                        <p className="text-[10px] font-mono uppercase text-white/40 tracking-widest">Booyahs</p>
                      </div>
                    </div>

                    <div className="glass-card p-6 group relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-ff-secondary/10 rounded-xl text-ff-secondary neon-icon">
                          <Zap className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-mono uppercase text-white/20 tracking-widest font-bold bg-white/5 px-2 py-1 rounded-md">
                          {squadStats.top3}W / {squadStats.totalMatches - squadStats.top3}L
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-4xl font-display font-black text-white value-glow">
                          {squadStats.totalMatches > 0 ? ((squadStats.top3 / squadStats.totalMatches) * 100).toFixed(0) : 0}%
                        </p>
                        <p className="text-[10px] font-mono uppercase text-white/40 tracking-widest">Call Success</p>
                      </div>
                    </div>
                  </div>

                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <section className="lg:col-span-2 glass-card p-8 space-y-8">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest">Fluxo de Performance</h3>
                          <p className="text-[9px] text-white/30 font-mono uppercase tracking-[0.2em]">Consolidado de Kills / Partida</p>
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg">
                          <TrendingUp className="w-4 h-4 text-ff-accent" />
                        </div>
                      </div>
                      <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={[...filteredMatches].reverse()}>
                            <defs>
                              <linearGradient id="colorKills" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} 
                              stroke="#ffffff10" 
                              fontSize={9} 
                              fontFamily="JetBrains Mono"
                            />
                            <YAxis stroke="#ffffff10" fontSize={9} fontFamily="JetBrains Mono" />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', fontSize: '10px' }}
                              itemStyle={{ color: '#10b981' }}
                            />
                            <Area type="monotone" dataKey="totalKills" stroke="#10b981" fillOpacity={1} fill="url(#colorKills)" strokeWidth={3} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </section>

                    <section className="glass-card p-8 space-y-8">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest">Domínio de Terreno</h3>
                          <p className="text-[9px] text-white/30 font-mono uppercase tracking-[0.2em]">Distribuição de Pontos</p>
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg">
                          <Globe className="w-4 h-4 text-ff-secondary" />
                        </div>
                      </div>
                      <div className="h-[300px] flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={maps.map(m => ({
                                name: m,
                                value: matches.filter(match => match.map === m).reduce((acc, match) => acc + (match.players[0]?.score || 0), 0)
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={90}
                              paddingAngle={8}
                              dataKey="value"
                            >
                              {maps.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'][index % 4]} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', fontSize: '10px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className="text-[8px] font-mono uppercase text-white/20 tracking-widest">Total</p>
                          <p className="text-2xl font-display font-black text-white">{squadStats.totalPoints}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {maps.map((m, i) => (
                          <div key={m} className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'][i % 4] }} />
                              <span className="text-white/60">{m}</span>
                            </div>
                            <span className="text-white font-bold">{matches.filter(match => match.map === m).length} Quedas</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Bottom Stats Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* MVP Highlight */}
                    <div className="lg:col-span-5 glass-card p-8 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Trophy className="w-32 h-32 text-ff-accent" />
                      </div>
                      <div className="relative z-10 space-y-8">
                        <div className="space-y-1">
                          <p className="text-[9px] font-mono uppercase text-ff-accent tracking-[0.3em] font-black">Destaque da última partida</p>
                          <h2 className="text-4xl font-display font-black text-white uppercase tracking-tight">
                            {[...(filteredMatches[0]?.players || [])].sort((a, b) => b.kills - a.kills)[0]?.playerName || 'N/A'}
                          </h2>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-[8px] font-mono uppercase text-white/40 tracking-widest">Score de Combate</p>
                            <div className="flex items-center gap-4">
                              <span className="text-4xl font-display font-black text-ff-accent">
                                {[...(filteredMatches[0]?.players || [])].sort((a, b) => b.kills - a.kills)[0]?.damage || 0}
                              </span>
                              <div className="px-3 py-1 bg-ff-accent/20 border border-ff-accent/30 rounded-md text-[10px] font-black text-ff-accent uppercase tracking-widest">
                                MVP
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Squad Averages */}
                    <div className="lg:col-span-7 glass-card p-8 space-y-8">
                      <div className="space-y-1">
                        <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest">Médias do Squad (Time)</h3>
                        <p className="text-[9px] text-white/30 font-mono uppercase tracking-[0.2em]">Análise consolidada por queda</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-[8px] font-mono uppercase text-white/40 tracking-widest">Dano Médio</p>
                            <p className="text-3xl font-display font-black text-white">
                              {Math.round(squadStats.totalDamage / (squadStats.totalMatches || 1))}
                            </p>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-ff-accent" style={{ width: '75%' }} />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-[8px] font-mono uppercase text-white/40 tracking-widest">Kills Squad</p>
                            <p className="text-3xl font-display font-black text-white">
                              {(squadStats.totalKills / (squadStats.totalMatches || 1)).toFixed(1)}
                            </p>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-ff-secondary" style={{ width: '60%' }} />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-[8px] font-mono uppercase text-white/40 tracking-widest">Sobrevivência</p>
                            <p className="text-3xl font-display font-black text-white">
                              {Math.round(matches.reduce((acc, m) => acc + m.placement, 0) / (matches.length || 1))}º
                            </p>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: '85%' }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-4 pt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-ff-accent" />
                          <span className="text-[8px] font-mono uppercase text-white/40 tracking-widest">Dano</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-ff-secondary" />
                          <span className="text-[8px] font-mono uppercase text-white/40 tracking-widest">Abates</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'matches' && (
                <div className="space-y-8">
                  {/* Analysis Metrics Header */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="glass-card p-6 border-l-4 border-ff-accent">
                      <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Média de Pontos</p>
                      <p className="text-3xl font-display font-black text-white">{squadStats.avgPoints}</p>
                    </div>
                    <div className="glass-card p-6 border-l-4 border-ff-secondary">
                      <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Média de Kills</p>
                      <p className="text-3xl font-display font-black text-white">{squadStats.avgKillsPerMatch}</p>
                    </div>
                    <div className="glass-card p-6 border-l-4 border-ff-orange">
                      <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Média de Colocação</p>
                      <p className="text-3xl font-display font-black text-white">{squadStats.avgPlacement}</p>
                    </div>
                    <div className="glass-card p-6 border-l-4 border-emerald-500">
                      <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Taxa de Booyah</p>
                      <p className="text-3xl font-display font-black text-white">
                        {squadStats.totalMatches > 0 ? ((squadStats.booyahs / squadStats.totalMatches) * 100).toFixed(1) : '0.0'}%
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-12">
                      <section className="glass-card p-8 space-y-8 inner-glow">
                        <div className="space-y-1">
                          <h3 className="text-xl font-display font-semibold text-white uppercase tracking-tight">Análise por Call (Landing)</h3>
                          <p className="text-xs text-[#AAAAAA] font-mono uppercase tracking-widest">Desempenho baseado no local de queda</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {callStats.map((stat, idx) => (
                            <div key={idx} className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl space-y-4 hover:bg-white/[0.04] transition-all">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-ff-orange/10 rounded-xl flex items-center justify-center">
                                    <Target className="w-5 h-5 text-ff-orange" />
                                  </div>
                                  <div>
                                    <p className="font-black text-white uppercase tracking-tight">{stat.call}</p>
                                    <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">{stat.map}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Quedas</p>
                                  <p className="text-xl font-display font-black text-white">{stat.count}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                <div className="space-y-1">
                                  <p className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Média Pontos</p>
                                  <p className="text-lg font-display font-black text-ff-orange">{stat.avgPoints}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                  <p className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Win Rate</p>
                                  <p className="text-lg font-display font-black text-emerald-500">{stat.winRate}%</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Média Kills</p>
                                  <p className="text-lg font-display font-black text-white">{stat.avgKills}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                  <p className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Média Pos.</p>
                                  <p className="text-lg font-display font-black text-white">{stat.avgPlacement}º</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {callStats.length === 0 && (
                            <div className="col-span-full py-10 text-center opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                              <p className="text-sm font-mono uppercase tracking-widest">Nenhuma call registrada ainda</p>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>

                    <div className="lg:col-span-12">
                      <section className="glass-card p-8 space-y-8 inner-glow">
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <h3 className="text-xl font-display font-semibold text-white uppercase tracking-tight">Histórico de Análise</h3>
                            <p className="text-xs text-[#AAAAAA] font-mono uppercase tracking-widest">Detalhamento por queda</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => setShowTournamentManager(true)}
                              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all text-[10px] font-mono uppercase tracking-widest font-black flex items-center gap-2"
                            >
                              <Settings className="w-3 h-3" />
                              Gerenciar Campeonatos
                            </button>
                            <div className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-widest">
                              {filteredMatches.length} Partidas encontradas
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {filteredMatches.map((match, i) => (
                            <motion.div 
                              key={match.id || i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="bg-white/[0.02] hover:bg-white/[0.04] p-5 rounded-2xl border border-white/[0.05] transition-all group"
                            >
                              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-ff-orange/10 rounded-xl flex items-center justify-center">
                                    <MapIcon className="w-5 h-5 text-ff-orange" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-black uppercase tracking-tight text-lg">{match.map}</span>
                                      <span className="text-[10px] bg-ff-orange/10 text-ff-orange px-2 py-0.5 rounded border border-ff-orange/20 font-black uppercase tracking-widest">Call: {match.call || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] bg-ff-orange/20 text-ff-orange px-2 py-0.5 rounded-md font-black uppercase tracking-widest">TOP {match.placement}</span>
                                      <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest">{match.tournament} • R{match.round}</span>
                                      {match.sourceCount && match.sourceCount > 1 && (
                                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-widest flex items-center gap-1">
                                          <CheckCircle2 className="w-2 h-2" />
                                          {match.sourceCount} Prints
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6">
                                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{new Date(match.date).toLocaleDateString('pt-BR')}</span>
                                  <button 
                                    onClick={() => removeMatch(match.id)}
                                    className="p-2 text-white/10 hover:text-ff-red hover:bg-ff-red/10 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {match.players.map((p, pi) => (
                                  <div key={pi} className="space-y-1">
                                    <p className="text-[10px] font-mono uppercase text-white/30 tracking-widest truncate">{p.playerName}</p>
                                    <div className="flex items-baseline gap-2">
                                      <p className="text-lg font-display font-black text-ff-orange">{p.kills}</p>
                                      <span className="text-[8px] font-mono uppercase text-white/20">Abates</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          ))}
                          {filteredMatches.length === 0 && (
                            <div className="py-20 text-center opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                              <History className="w-12 h-12 mx-auto mb-4" />
                              <p className="text-sm font-mono uppercase tracking-widest">Nenhuma partida encontrada para os filtros aplicados</p>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'players' && (
                <div className="space-y-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-display font-semibold text-white uppercase tracking-tight">Elite do Squad</h3>
                      <p className="text-sm text-[#AAAAAA] font-mono uppercase tracking-widest">Ranking de performance acumulada</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 p-1 rounded-xl border border-white/10">
                      <button 
                        onClick={() => setPlayerView('overview')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all",
                          playerView === 'overview' ? "bg-ff-orange text-white font-black shadow-lg shadow-ff-orange/20" : "text-[#AAAAAA] hover:text-white"
                        )}
                      >
                        Visão Geral
                      </button>
                      <button 
                        onClick={() => setPlayerView('deep')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all",
                          playerView === 'deep' ? "bg-ff-orange text-white font-black shadow-lg shadow-ff-orange/20" : "text-[#AAAAAA] hover:text-white"
                        )}
                      >
                        Análise Profunda
                      </button>
                    </div>
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => setActiveTab('settings')}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-[10px] font-mono uppercase tracking-widest text-[#AAAAAA] hover:text-white"
                      >
                        <Settings className="w-4 h-4 text-ff-orange neon-icon" />
                        Gerenciar
                      </button>
                      <div className="text-right space-y-1 hidden sm:block">
                        <p className="text-[10px] font-mono uppercase text-[#AAAAAA] tracking-widest">MVP Atual</p>
                        <div className="flex items-center gap-2 justify-end">
                          <Trophy className="w-4 h-4 text-ff-orange neon-icon" />
                          <p className="text-xl font-display font-black text-ff-orange uppercase tracking-tight neon-text">
                            {[...playerStats].sort((a, b) => b.totalKills - a.totalKills)[0]?.nickname || '---'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {playerStats.length === 0 ? (
                    <div className="glass-card p-20 flex flex-col items-center justify-center text-center space-y-6 border-dashed border-white/10">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                        <Users className="w-10 h-10 text-white/20" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xl font-display font-black uppercase">Nenhum jogador encontrado</h4>
                        <p className="text-sm text-white/40 max-w-xs">Adicione os membros do seu squad nas configurações para começar a trackear.</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab('settings')}
                        className="bg-ff-orange text-white font-black px-8 py-3 rounded-xl shadow-lg shadow-ff-orange/20"
                      >
                        Adicionar Jogadores
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {[...playerStats].sort((a, b) => b.totalKills - a.totalKills).map((player, idx) => (
                      <motion.div 
                        key={player.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={cn(
                          "glass-card p-6 relative overflow-hidden group transition-all",
                          idx === 0 ? "border-ff-yellow/30 shadow-[0_0_40px_-10px_rgba(255,204,0,0.1)] bg-ff-yellow/[0.01]" : "hover:border-ff-orange/30"
                        )}
                      >
                        {idx === 0 && (
                          <div className="absolute -top-16 -right-16 w-32 h-32 bg-ff-yellow/5 blur-[80px] rounded-full animate-pulse" />
                        )}
                        
                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-xl",
                              idx === 0 ? "bg-ff-orange text-white neon-glow" : "bg-white/5 text-white/20 border border-white/10"
                            )}>
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-lg uppercase tracking-tight leading-none truncate max-w-[120px] text-white">
                                {player.nickname}
                              </h4>
                              <p className="text-[8px] text-[#AAAAAA] font-mono uppercase mt-1 tracking-widest">{player.matchCount} Quedas</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] text-[#AAAAAA] font-mono uppercase tracking-widest">
                              {playerView === 'overview' ? 'Média Abates' : 'Dano/Min'}
                            </p>
                            <p className="text-xl font-display font-black text-ff-orange neon-text">
                              {playerView === 'overview' ? player.avgKills : player.damagePerMinute}
                            </p>
                          </div>
                        </div>

                        {playerView === 'overview' ? (
                          <>
                            <div className="relative h-48 mb-4 -mx-2">
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={player.radarData}>
                                  <PolarGrid stroke="#ffffff10" />
                                  <PolarAngleAxis 
                                    dataKey="subject" 
                                    tick={{ fill: '#ffffff40', fontSize: 8, fontVariant: 'small-caps', fontWeight: 'bold' }} 
                                  />
                                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                  <Radar
                                    name={player.nickname}
                                    dataKey="value"
                                    stroke="#ff6b00"
                                    fill="#ff6b00"
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                  />
                                </RadarChart>
                              </ResponsiveContainer>
                              <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-ff-orange/5 to-transparent opacity-50" />
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-6 relative z-10">
                              <div className="bg-white/[0.02] p-2 rounded-xl text-center border border-white/[0.03]">
                                <p className="text-[7px] text-[#AAAAAA] font-mono uppercase tracking-widest mb-1">Abates</p>
                                <p className="text-sm font-display font-bold text-ff-orange neon-text">{player.totalKills}</p>
                              </div>
                              <div className="bg-white/[0.02] p-2 rounded-xl text-center border border-white/[0.03]">
                                <p className="text-[7px] text-[#AAAAAA] font-mono uppercase tracking-widest mb-1">Dano Médio</p>
                                <p className="text-sm font-display font-bold text-ff-orange neon-text">{player.avgDamage}</p>
                              </div>
                              <div className="bg-white/[0.02] p-2 rounded-xl text-center border border-white/[0.03]">
                                <p className="text-[7px] text-[#AAAAAA] font-mono uppercase tracking-widest mb-1">Quedas</p>
                                <p className="text-sm font-display font-bold">{player.matchCount}</p>
                              </div>
                              <div className="bg-white/[0.02] p-2 rounded-xl text-center border border-white/[0.03]">
                                <p className="text-[7px] text-[#AAAAAA] font-mono uppercase tracking-widest mb-1">Assis.</p>
                                <p className="text-sm font-display font-bold">{player.totalAssists}</p>
                              </div>
                            </div>

                            <div className="space-y-2 relative z-10">
                              <div className="bg-ff-orange/5 p-2.5 rounded-xl border border-ff-orange/10 flex justify-between items-center">
                                <span className="text-[8px] text-ff-orange font-mono uppercase tracking-widest font-black">Participação</span>
                                <span className="text-sm font-display font-black">{player.killParticipation}%</span>
                              </div>
                              <div className="bg-emerald-400/5 p-2.5 rounded-xl border border-emerald-400/10 flex justify-between items-center">
                                <span className="text-[8px] text-emerald-400 font-mono uppercase tracking-widest font-black">Share Dano</span>
                                <span className="text-sm font-display font-black">{player.damageShare}%</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-6 relative z-10 py-4">
                            <div className="grid grid-cols-1 gap-4">
                              <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] space-y-2 group hover:border-ff-orange/20 transition-all">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-mono uppercase text-[#AAAAAA] tracking-widest">Participation Rate</span>
                                  <Activity className="w-3 h-3 text-ff-orange" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <p className="text-2xl font-display font-black text-white">{player.participationRate}%</p>
                                  <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">K+A / Squad K</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, parseFloat(player.participationRate))}%` }}
                                    className="h-full bg-ff-orange"
                                  />
                                </div>
                              </div>

                              <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] space-y-2 group hover:border-ff-orange/20 transition-all">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-mono uppercase text-[#AAAAAA] tracking-widest">Support Index</span>
                                  <Shield className="w-3 h-3 text-ff-orange" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <p className="text-2xl font-display font-black text-white">{player.supportIndex}</p>
                                  <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Assists + Respawns</span>
                                </div>
                              </div>

                              <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] space-y-2 group hover:border-ff-orange/20 transition-all">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-mono uppercase text-[#AAAAAA] tracking-widest">Combat Efficiency</span>
                                  <Zap className="w-3 h-3 text-ff-orange" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <p className="text-2xl font-display font-black text-white">{player.combatEfficiency}</p>
                                  <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Dano / Abate</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
                          <div className="flex items-center gap-2">
                            <MapIcon className="w-3 h-3 text-white/10" />
                            <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest truncate max-w-[80px]">{player.bestMap}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-white/10" />
                            <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest font-black">
                              {Math.floor(player.avgSurvival / 60)}:{(player.avgSurvival % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                        </div>

                        {idx === 0 && (
                          <button 
                            onClick={() => generateMVPCard({
                              nick: player.nickname,
                              abates: player.totalKills,
                              dano_medio: player.avgDamage,
                              win_rate: `${squadStats.totalMatches > 0 ? ((squadStats.booyahs / squadStats.totalMatches) * 100).toFixed(0) : 0}%`,
                              periodo: matches.length > 0 ? `Desde ${new Date(matches[matches.length-1].date).toLocaleDateString('pt-BR')}` : 'Resumo Geral'
                            })}
                            className="w-full mt-6 bg-ff-yellow text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] hover:bg-ff-yellow/80 transition-all shadow-lg shadow-ff-yellow/10 relative z-10"
                          >
                            <Download className="w-4 h-4" />
                            Baixar Card MVP
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

              {activeTab === 'settings' && (
                <div className="max-w-4xl mx-auto space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="glass-card p-10 space-y-8 inner-glow">
                      <div className="space-y-1">
                        <h3 className="text-xl font-display font-semibold text-white uppercase tracking-tight flex items-center gap-3">
                          <div className="p-2 bg-ff-orange/10 rounded-xl">
                            <Users className="w-6 h-6 text-ff-orange neon-icon" />
                          </div>
                          Gerenciar Squad
                        </h3>
                        <p className="text-xs text-[#AAAAAA] font-mono uppercase tracking-widest">Adicione ou remova membros</p>
                      </div>

                      <div className="space-y-6">
                        <div className="flex gap-3">
                          <input 
                            type="text" 
                            value={newNickname} 
                            onChange={(e) => setNewNickname(e.target.value)} 
                            onKeyPress={(e) => e.key === 'Enter' && addPlayer()} 
                            placeholder="Nickname do jogador..." 
                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-ff-orange transition-all font-medium placeholder:text-white/20" 
                          />
                          <button 
                            onClick={addPlayer} 
                            className="bg-ff-orange hover:bg-ff-orange/80 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-lg shadow-ff-orange/20 active:scale-95"
                          >
                            <PlusCircle className="w-6 h-6" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                          {players.map(player => (
                            <motion.div 
                              layout
                              key={player.id} 
                              className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl group hover:bg-white/[0.04] transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-black text-white/20 group-hover:text-ff-orange transition-colors">
                                  {player.nickname.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold tracking-tight">{player.nickname}</span>
                              </div>
                              <button 
                                onClick={() => removePlayer(player.id)} 
                                className="p-2 text-white/10 hover:text-ff-red hover:bg-ff-red/10 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="glass-card p-10 space-y-8 inner-glow">
                      <div className="space-y-1">
                        <h3 className="text-xl font-display font-semibold text-white uppercase tracking-tight flex items-center gap-3">
                          <div className="p-2 bg-ff-yellow/10 rounded-xl">
                            <Target className="w-6 h-6 text-ff-orange neon-icon" />
                          </div>
                          Regras de Pontuação
                        </h3>
                        <p className="text-xs text-[#AAAAAA] font-mono uppercase tracking-widest">Configure como os pontos são calculados</p>
                      </div>

                      <div className="space-y-8">
                        <div className="flex items-center justify-between p-5 bg-ff-orange/5 border border-ff-orange/10 rounded-2xl">
                          <div className="space-y-1">
                            <p className="font-black uppercase tracking-tight text-ff-orange">Padrão LBFF</p>
                            <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Usar regras oficiais da liga</p>
                          </div>
                          <button 
                            onClick={() => setScoring(prev => ({ ...DEFAULT_SCORING, isStandardLBFF: !prev.isStandardLBFF }))}
                            className={cn(
                              "w-14 h-8 rounded-full transition-all relative p-1",
                              scoring.isStandardLBFF ? "bg-ff-orange" : "bg-white/10"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 bg-white rounded-full transition-all shadow-lg",
                              scoring.isStandardLBFF ? "translate-x-6" : "translate-x-0"
                            )} />
                          </button>
                        </div>

                        {!scoring.isStandardLBFF && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-6"
                          >
                            <div className="space-y-4">
                              <label className="text-[10px] font-mono uppercase text-white/40 tracking-widest font-black">Pontos por Abate</label>
                              <input 
                                type="number" 
                                value={scoring.killPoints} 
                                onChange={(e) => setScoring(prev => ({ ...prev, killPoints: parseInt(e.target.value) || 0 }))} 
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-ff-orange transition-all font-black text-xl text-ff-orange" 
                              />
                            </div>
                            <div className="space-y-4">
                              <label className="text-[10px] font-mono uppercase text-white/40 tracking-widest font-black">Pontos por Posição</label>
                              <div className="grid grid-cols-4 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(pos => (
                                  <div key={pos} className="space-y-2">
                                    <span className="text-[8px] text-white/20 font-mono uppercase block text-center">Top {pos}</span>
                                    <input 
                                      type="number" 
                                      value={scoring.placementPoints[pos] || 0} 
                                      onChange={(e) => {
                                        const newPoints = { ...scoring.placementPoints, [pos]: parseInt(e.target.value) || 0 };
                                        setScoring(prev => ({ ...prev, placementPoints: newPoints }));
                                      }} 
                                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-2 py-3 text-center focus:outline-none focus:border-ff-orange transition-all font-bold text-sm" 
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </section>

                    <section className="glass-card p-10 space-y-8 inner-glow md:col-span-2">
                      <div className="space-y-1">
                        <h3 className="text-xl font-display font-semibold text-white uppercase tracking-tight flex items-center gap-3">
                          <div className="p-2 bg-ff-red/10 rounded-xl">
                            <Database className="w-6 h-6 text-ff-red neon-icon" />
                          </div>
                          Gerenciamento de Dados
                        </h3>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-[#AAAAAA] font-mono uppercase tracking-widest">Excluir campeonatos ou limpar histórico</p>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => setShowTournamentManager(true)}
                              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all text-[10px] font-mono uppercase tracking-widest font-black"
                            >
                              Gerenciar Campeonatos
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm('Tem certeza que deseja apagar TODO o histórico de partidas? Esta ação é irreversível.')) {
                                  setMatches([]);
                                  clearAllMatchesFromServer();
                                }
                              }}
                              className="px-4 py-2 bg-ff-red/10 hover:bg-ff-red/20 text-ff-red border border-ff-red/20 rounded-xl transition-all text-[10px] font-mono uppercase tracking-widest font-black"
                            >
                              Limpar Tudo
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tournaments.map(t => (
                          <div key={t} className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl flex justify-between items-center group hover:border-ff-red/30 transition-all">
                            <div className="space-y-1">
                              <p className="font-bold text-white uppercase tracking-tight">{t}</p>
                              <p className="text-[10px] text-[#AAAAAA] font-mono uppercase tracking-widest">
                                {matches.filter(m => m.tournament === t).length} Quedas
                              </p>
                            </div>
                            <button 
                              onClick={() => removeTournament(t)}
                              className="p-3 bg-ff-red/5 text-ff-red/40 hover:text-ff-red hover:bg-ff-red/10 rounded-xl transition-all"
                              title="Excluir Campeonato"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                        {tournaments.length === 0 && (
                          <div className="col-span-full py-12 text-center opacity-20 border-2 border-dashed border-white/5 rounded-2xl">
                            <p className="text-xs font-mono uppercase tracking-widest">Nenhum campeonato registrado</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="h-12 border-t border-white/5 flex items-center justify-center bg-black/20 shrink-0">
          <p className="text-[10px] text-white/20 uppercase tracking-widest">© 2026 FF Stats Pro - Advanced Analytics Engine</p>
        </footer>
      </div>

      {/* Metadata Modal */}
      <AnimatePresence>
        {showMetadataForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card p-8 max-w-md w-full space-y-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-ff-orange rounded-xl flex items-center justify-center neon-glow">
                  <Trophy className="text-white w-6 h-6" />
                </div>
                <h3 className="text-xl font-display font-bold uppercase">Detalhes da Rodada</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-white/40">Campeonato / Torneio</label>
                  <input 
                    type="text" 
                    value={metadataInput.tournament}
                    onChange={(e) => setMetadataInput(prev => ({ ...prev, tournament: e.target.value }))}
                    placeholder="Ex: LBFF, CPN, Treino..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-ff-orange outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-white/40">Rodada / Queda</label>
                    <input 
                      type="text" 
                      value={metadataInput.round}
                      onChange={(e) => setMetadataInput(prev => ({ ...prev, round: e.target.value }))}
                      placeholder="Ex: 1, Final..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-ff-orange outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-white/40">Data</label>
                    <input 
                      type="date" 
                      value={metadataInput.date}
                      onChange={(e) => setMetadataInput(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-ff-orange outline-none"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={saveBatchMetadata}
                className="w-full bg-ff-orange hover:bg-ff-orange/80 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-ff-orange/20"
              >
                Confirmar Dados
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nickname Mapping Modal */}
      <AnimatePresence>
        {pendingMatch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card p-8 max-w-2xl w-full space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ff-orange rounded-xl flex items-center justify-center neon-glow">
                    <Target className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold uppercase">Finalizar Queda</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-white/40">Defina a call e mapeie os jogadores para o mapa {pendingMatch.map}.</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono bg-white/10 px-2 py-1 rounded uppercase">
                    {analysisQueue.length + 1} Quedas Restantes
                  </span>
                </div>
              </div>

              {/* Call Input Section */}
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-ff-orange" />
                  <p className="text-[10px] font-mono uppercase text-white/40 tracking-widest">Qual foi a Call (Local de Queda) em {pendingMatch.map}?</p>
                </div>
                <input 
                  type="text"
                  value={callInput}
                  onChange={(e) => setCallInput(e.target.value)}
                  placeholder="Ex: Mill, Clock Tower, Pochinok..."
                  className="w-full bg-ff-dark border border-white/10 rounded-xl px-5 py-3 text-white outline-none focus:border-ff-orange transition-all font-bold placeholder:text-white/10"
                />
              </div>

              {unknownNicks.length > 0 && (
                <>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                    <p className="text-[10px] font-mono uppercase text-white/40">Jogadores Disponíveis para Mapear:</p>
                    <div className="flex flex-wrap gap-2">
                      {players.map(p => {
                        const isUsed = Object.values(mappingInputs).includes(p.nickname);
                        return (
                          <span 
                            key={p.id} 
                            className={cn(
                              "px-2 py-1 rounded text-[10px] font-bold uppercase transition-all",
                              isUsed ? "bg-white/5 text-white/20 line-through" : "bg-ff-orange/20 text-ff-orange border border-ff-orange/20"
                            )}
                          >
                            {p.nickname}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {unknownNicks.map((nick) => (
                      <div key={nick} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <p className="text-[10px] font-mono uppercase text-white/40 mb-1">Nick no Print</p>
                          <p className="font-bold text-ff-orange">{nick}</p>
                        </div>
                        <ChevronRight className="hidden md:block w-4 h-4 text-white/20" />
                        <div className="flex-1">
                          <p className="text-[10px] font-mono uppercase text-white/40 mb-1">Mapear para:</p>
                          <div className="flex gap-2 relative">
                            <div className="relative flex-1">
                              <input 
                                type="text"
                                value={mappingInputs[nick] === '__IGNORE__' ? '' : mappingInputs[nick] || ''}
                                disabled={mappingInputs[nick] === '__IGNORE__'}
                                onFocus={() => setActiveDropdown(nick)}
                                onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                                onChange={(e) => {
                                  setMappingInputs(prev => ({ ...prev, [nick]: e.target.value }));
                                  setActiveDropdown(nick);
                                }}
                                placeholder="Digite ou selecione o nick..."
                                className="w-full bg-ff-dark border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-ff-orange disabled:opacity-50"
                              />
                              <AnimatePresence>
                                {activeDropdown === nick && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute z-50 left-0 right-0 mt-2 bg-[#121212] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar"
                                  >
                                    {players
                                      .filter(p => {
                                        const term = (mappingInputs[nick] || '').toLowerCase();
                                        return p.nickname.toLowerCase().includes(term) && 
                                               !Object.entries(mappingInputs).some(([k, v]) => k !== nick && v === p.nickname);
                                      })
                                      .map(p => (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() => {
                                            setMappingInputs(prev => ({ ...prev, [nick]: p.nickname }));
                                            setActiveDropdown(null);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm hover:bg-ff-orange/10 hover:text-ff-orange transition-colors border-b border-white/5 last:border-0"
                                        >
                                          {p.nickname}
                                        </button>
                                      ))}
                                    {players.filter(p => p.nickname.toLowerCase().includes((mappingInputs[nick] || '').toLowerCase())).length === 0 && (
                                      <div className="px-4 py-3 text-xs text-white/40 italic">
                                        Nenhum jogador encontrado. Continue digitando para criar um novo.
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            <button 
                              onClick={() => setMappingInputs(prev => ({ ...prev, [nick]: prev[nick] === '__IGNORE__' ? nick : '__IGNORE__' }))}
                              className={cn(
                                "px-3 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all",
                                mappingInputs[nick] === '__IGNORE__' 
                                  ? "bg-ff-red/20 border-ff-red/40 text-ff-red" 
                                  : "bg-white/5 border-white/10 text-white/40 hover:text-ff-red hover:border-ff-red/20"
                              )}
                            >
                          {mappingInputs[nick] === '__IGNORE__' ? 'Ignorado' : 'Ignorar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <button 
            onClick={saveMappings}
            className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-white/90 transition-all uppercase tracking-widest"
          >
            Salvar e Continuar
          </button>
        </motion.div>
      </motion.div>
    )}

        {/* Upload Modal */}
        <AnimatePresence>
          {isUploadModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-ff-dark/95 backdrop-blur-xl p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-2xl bg-ff-card border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-ff-orange/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                
                <div className="flex justify-between items-center mb-10 relative z-10">
                  <div className="space-y-1">
                    <h3 className="text-3xl font-display font-black text-white uppercase tracking-tight flex items-center gap-4">
                      <div className="p-3 bg-ff-orange/10 rounded-2xl">
                        <PlusCircle className="w-8 h-8 text-ff-orange neon-icon" />
                      </div>
                      Inserir Dados
                    </h3>
                    <p className="text-xs font-mono text-[#AAAAAA] uppercase tracking-[0.2em]">
                      Adicione resultados via print do Free Fire
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsUploadModalOpen(false)}
                    className="p-4 hover:bg-white/5 rounded-2xl transition-all text-white/20 hover:text-white"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </div>

                <div className="space-y-8 relative z-10">
                  <div {...getRootProps()} className={cn(
                    "border-2 border-dashed rounded-3xl p-16 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-8 group",
                    isDragActive ? "border-ff-orange bg-ff-orange/5" : "border-white/10 hover:border-white/20 bg-white/[0.02]",
                    isAnalyzing && "opacity-50 cursor-not-allowed"
                  )}>
                    <input {...getInputProps()} />
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center gap-8 w-full max-w-xs">
                        <div className="relative w-24 h-24">
                          <Loader2 className="w-24 h-24 text-ff-orange animate-spin opacity-20" />
                          <div className="absolute inset-0 flex items-center justify-center font-display font-black text-ff-orange text-2xl">
                            {Math.round((analysisProgress.current / analysisProgress.total) * 100)}%
                          </div>
                        </div>
                        <div className="space-y-4 w-full text-center">
                          <p className="text-lg font-black uppercase tracking-widest text-white animate-pulse">
                            Analisando Prints...
                          </p>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(analysisProgress.current / analysisProgress.total) * 100}%` }}
                              className="h-full bg-ff-orange shadow-[0_0_15px_rgba(255,107,0,0.5)]"
                            />
                          </div>
                          <p className="text-xs font-mono text-[#AAAAAA] uppercase tracking-widest">
                            {analysisProgress.current} de {analysisProgress.total} processados
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-xl">
                          <Upload className="w-12 h-12 text-white/20 group-hover:text-ff-orange transition-colors" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xl font-black uppercase tracking-tight">Arraste seus prints aqui</p>
                          <p className="text-xs text-white/30 uppercase tracking-[0.2em]">ou clique para selecionar arquivos</p>
                        </div>
                        <div className="flex gap-4 mt-4">
                          <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/5 text-[10px] font-mono text-white/40 uppercase tracking-widest">PNG</div>
                          <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/5 text-[10px] font-mono text-white/40 uppercase tracking-widest">JPG</div>
                          <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/5 text-[10px] font-mono text-white/40 uppercase tracking-widest">WEBP</div>
                        </div>
                      </>
                    )}
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-ff-red/10 border border-ff-red/20 rounded-2xl flex items-center gap-4 text-ff-red text-sm font-bold"
                    >
                      <X className="w-5 h-5 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </div>

                <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-ff-orange animate-pulse" />
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Créditos: {credits} disponíveis</span>
                  </div>
                  <button 
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {showTournamentManager && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ff-dark/95 backdrop-blur-xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="w-full max-w-4xl bg-ff-card border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-ff-red/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
              
              <div className="flex justify-between items-center mb-10 relative z-10">
                <div className="space-y-1">
                  <h3 className="text-3xl font-display font-black text-white uppercase tracking-tight flex items-center gap-4">
                    <div className="p-3 bg-ff-red/10 rounded-2xl">
                      <Trash2 className="w-8 h-8 text-ff-red neon-icon" />
                    </div>
                    Gerenciar Campeonatos
                  </h3>
                  <p className="text-xs font-mono text-[#AAAAAA] uppercase tracking-[0.2em]">
                    Exclua campeonatos e limpe o histórico de partidas
                  </p>
                </div>
                <button 
                  onClick={() => setShowTournamentManager(false)}
                  className="p-4 hover:bg-white/5 rounded-2xl transition-all text-white/20 hover:text-white"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="space-y-8 relative z-10">
                <div className="flex justify-between items-center p-6 bg-ff-red/5 border border-ff-red/10 rounded-3xl">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white uppercase tracking-tight">Limpar Todo o Histórico</p>
                    <p className="text-[10px] text-ff-red/60 font-mono uppercase tracking-widest">Apaga absolutamente todas as partidas do banco de dados</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm('Tem certeza que deseja apagar TODO o histórico de partidas? Esta ação é irreversível.')) {
                        setMatches([]);
                        clearAllMatchesFromServer();
                      }
                    }}
                    className="px-6 py-3 bg-ff-red text-white rounded-xl font-black text-[10px] font-mono uppercase tracking-widest hover:bg-ff-red/80 transition-all shadow-[0_0_20px_rgba(255,68,68,0.3)]"
                  >
                    Limpar Tudo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {tournaments.map(t => (
                    <div key={t} className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl flex justify-between items-center group hover:border-ff-red/30 transition-all">
                      <div className="space-y-1">
                        <p className="font-bold text-white uppercase tracking-tight">{t}</p>
                        <p className="text-[10px] text-[#AAAAAA] font-mono uppercase tracking-widest">
                          {matches.filter(m => m.tournament === t).length} Quedas Registradas
                        </p>
                      </div>
                      <button 
                        onClick={() => removeTournament(t)}
                        className="p-3 bg-ff-red/5 text-ff-red/40 hover:text-ff-red hover:bg-ff-red/10 rounded-xl transition-all"
                        title="Excluir Campeonato"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {tournaments.length === 0 && (
                    <div className="col-span-full py-12 text-center opacity-20 border-2 border-dashed border-white/5 rounded-2xl">
                      <p className="text-xs font-mono uppercase tracking-widest">Nenhum campeonato registrado</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setShowTournamentManager(false)}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-xs font-mono uppercase tracking-widest transition-all"
                >
                  Fechar Gerenciador
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ff-dark/95 backdrop-blur-xl"
          >
            <div className="flex flex-col items-center gap-8 w-full max-w-md p-10">
              <div className="relative w-32 h-32">
                <Loader2 className="w-32 h-32 text-ff-orange animate-spin opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center font-display font-black text-ff-orange text-3xl">
                  {Math.round((analysisProgress.current / analysisProgress.total) * 100)}%
                </div>
              </div>
              
              <div className="space-y-6 w-full text-center">
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-black uppercase tracking-tight text-white">
                    Processando Inteligência
                  </h3>
                  <p className="text-xs font-mono text-[#AAAAAA] uppercase tracking-[0.3em] animate-pulse">
                    Extraindo dados dos prints via OCR
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(analysisProgress.current / (analysisProgress.total || 1)) * 100}%` }}
                      className="h-full bg-gradient-to-r from-ff-orange/50 to-ff-orange shadow-[0_0_20px_rgba(255,107,0,0.4)]"
                    />
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                      Progresso da Análise
                    </span>
                    <span className="text-[10px] font-mono text-ff-orange uppercase tracking-widest font-black">
                      {analysisProgress.current} / {analysisProgress.total} Imagens
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-center gap-3 text-[10px] font-mono text-white/20 uppercase tracking-widest">
                  <Zap className="w-3 h-3" />
                  <span>Aguarde, isso pode levar alguns segundos</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group",
        active ? "bg-ff-accent/10 text-ff-accent" : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      {active && (
        <motion.div 
          layoutId="sidebar-active"
          className="absolute left-0 w-1 h-6 bg-ff-accent rounded-r-full"
        />
      )}
      <div className={cn(
        "relative z-10 shrink-0 transition-transform duration-300",
        active ? "scale-110 text-ff-accent neon-icon" : "group-hover:scale-110"
      )}>
        {icon}
      </div>
      {!collapsed && (
        <span className={cn(
          "relative z-10 font-bold text-[10px] uppercase font-mono whitespace-nowrap overflow-hidden tracking-widest transition-colors",
          active ? "text-white" : "text-inherit"
        )}>
          {label}
        </span>
      )}
    </button>
  );
}

function StatBox({ icon, label, value, color, className, isCritical }: { icon: React.ReactNode, label: string, value: string | number, color: string, className?: string, isCritical?: boolean }) {
  return (
    <div className={cn("glass-card p-6 flex flex-col justify-between group relative overflow-hidden inner-glow", className)}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700" />
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl bg-white/5 text-ff-orange transition-all duration-300 group-hover:scale-110 neon-icon")}>
            {icon}
          </div>
          <span className="text-[10px] font-mono uppercase text-[#AAAAAA] tracking-widest font-bold">{label}</span>
        </div>
      </div>
      <div className={cn(
        "text-3xl font-display font-black tracking-tight relative z-10 transition-all duration-500 group-hover:translate-x-1",
        isCritical ? "text-white value-glow" : color
      )}>
        {value}
      </div>
    </div>
  );
}
