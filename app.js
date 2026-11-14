/**
 * छठ घाट — Bihari Nostalgia Radio
 * Cloned & Enhanced for Rohan
 * Integrated Player, 99 Chhath Songs, Genuine Live Listeners & Direct 1-Tap Playback
 */

(function () {
  'use strict';

  // --- Global State ---
  const songs = window.SONGS || [];
  let currentIndex = 0;
  let player = null;
  let isPlayerReady = false;
  let isPlaying = false;
  let isShuffle = true;
  let currentTime = 0;
  let duration = 0;
  let progressInterval = null;
  let isDraggingSeek = false;
  let favorites = new Set();
  let pendingPlaySongId = null;

  // Load favorites from localStorage
  try {
    const savedFavs = JSON.parse(localStorage.getItem('apnabihar_favs') || '[]');
    savedFavs.forEach(id => favorites.add(id));
  } catch (e) {}

  // --- DOM Elements ---
  const playlistSheet = document.getElementById('playlistSheet');
  const sheetBackdrop = document.getElementById('sheetBackdrop');
  const sheetDragHandle = document.getElementById('sheetDragHandle');
  const mainPill = document.getElementById('mainPill');
  const pillArt = document.getElementById('pillArt');
  const pillArtImg = document.getElementById('pillArtImg');
  const pillTitle = document.getElementById('pillTitle');
  const pillArtist = document.getElementById('pillArtist');
  const pillSeek = document.getElementById('pillSeek');
  const pillFill = document.getElementById('pillFill');
  const pillTime = document.getElementById('pillTime');
  const playBtn = document.getElementById('playBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const playlistToggleBtn = document.getElementById('playlistToggleBtn');
  const pillMetaToggle = document.getElementById('pillMetaToggle');
  const closeExpandedBtn = document.getElementById('closeExpandedBtn');
  const shuffleToggleBtn = document.getElementById('shuffleToggleBtn');
  const shuffleStatusText = document.getElementById('shuffleStatusText');

  // List & Search Elements
  const expandedSongList = document.getElementById('expandedSongList');
  const songSearchInput = document.getElementById('songSearchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const singerChips = document.getElementById('singerChips');
  const expandedCountBadge = document.getElementById('expandedCountBadge');
  const queueBadge = document.getElementById('queueBadge');

  // Ambient Ghat Sound, Background Audio Keeper & Credit
  const bgAudioKeeper = document.getElementById('bgAudioKeeper');
  const ambientSoundBtn = document.getElementById('ambientSoundBtn');
  const ambientSoundText = document.getElementById('ambientSoundText');
  const rohanCredit = document.getElementById('rohanCredit');
  const toastEl = document.getElementById('toast');
  const onlineCountEl = document.getElementById('onlineCount');

  // Initial random song or #1 masterpiece (Kelwa Ke Paat Par by Sharda Sinha)
  currentIndex = 0; // Starts at legendary #1 track

  // --- Format Seconds into M:SS ---
  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // --- Toast notification ---
  let toastTimer = null;
  function showToast(msg, durationMs = 2800) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, durationMs);
  }

  // ==========================================================================
  // GENUINE REAL-TIME PRESENCE (ACTUAL LIVE LISTENERS)
  // ==========================================================================

  const SESSION_KEY = 'apnabihar_session_uuid';
  let mySessionId = sessionStorage.getItem(SESSION_KEY);
  if (!mySessionId) {
    mySessionId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem(SESSION_KEY, mySessionId);
  }

  // Local tab synchronization for 100% genuine multi-tab count
  const broadcast = window.BroadcastChannel ? new BroadcastChannel('apnabihar_presence_bus') : null;

  async function reportPresence() {
    try {
      const res = await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mySessionId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.count === 'number') {
          updateLiveCountDisplay(data.count);
          return;
        }
      }
    } catch (e) {
      // Fallback to local multi-tab heartbeat
    }

    // LocalStorage fallback for actual alive tabs
    try {
      const now = Date.now();
      const tabs = JSON.parse(localStorage.getItem('apnabihar_active_tabs') || '{}');
      tabs[mySessionId] = now;
      // Clean dead tabs older than 18 seconds
      for (const [id, seen] of Object.entries(tabs)) {
        if (now - seen > 18000) delete tabs[id];
      }
      localStorage.setItem('apnabihar_active_tabs', JSON.stringify(tabs));
      const actualCount = Math.max(1, Object.keys(tabs).length);
      updateLiveCountDisplay(actualCount);
    } catch (e) {
      updateLiveCountDisplay(1);
    }
  }

  function updateLiveCountDisplay(count) {
    if (onlineCountEl) {
      onlineCountEl.textContent = count;
    }
  }

  // Heartbeat every 8 seconds
  reportPresence();
  setInterval(reportPresence, 8000);

  // Clean on unload
  window.addEventListener('beforeunload', () => {
    try {
      const tabs = JSON.parse(localStorage.getItem('apnabihar_active_tabs') || '{}');
      delete tabs[mySessionId];
      localStorage.setItem('apnabihar_active_tabs', JSON.stringify(tabs));
    } catch (e) {}
  });

  // ==========================================================================
  // FLOATING RIVER DIYAS GENERATOR
  // ==========================================================================
  const diyasContainer = document.getElementById('diyasContainer');
  if (diyasContainer) {
    function spawnDiya() {
      const diya = document.createElement('div');
      diya.className = 'floating-diya';
      const startX = Math.random() * window.innerWidth;
      const startY = Math.random() * (window.innerHeight * 0.22);
      const duration = 14 + Math.random() * 12;

      diya.style.left = `${startX}px`;
      diya.style.bottom = `${startY}px`;
      diya.style.animationDuration = `${duration}s`;

      diyasContainer.appendChild(diya);
      setTimeout(() => diya.remove(), duration * 1000);
    }

    for (let i = 0; i < 6; i++) {
      setTimeout(spawnDiya, i * 1800);
    }
    setInterval(spawnDiya, 3500);
  }

  // ==========================================================================
  // GHAT AMBIENCE AUDIO (SACRED BELL & RIVER BREEZE)
  // ==========================================================================
  let audioCtx = null;
  let isAmbientOn = false;
  let bellTimer = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTempleBell() {
    if (!audioCtx || !isAmbientOn) return;
    try {
      const now = audioCtx.currentTime;
      // Resonant fundamental + harmonics of a temple brass bell
      const freqs = [587.33, 880, 1174.66, 1760]; // D5 note harmonics
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        const initialGain = 0.08 / (idx + 1);
        gain.gain.setValueAtTime(initialGain, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 3.6);
      });
    } catch (e) {}
  }

  function toggleAmbientSound() {
    initAudioContext();
    isAmbientOn = !isAmbientOn;
    if (isAmbientOn) {
      ambientSoundBtn.classList.add('is-playing');
      ambientSoundText.textContent = 'ध्वनि चालू';
      showToast('घाट की पावन घंटी चालू भइल 🔔', 2500);
      playTempleBell();
      bellTimer = setInterval(playTempleBell, 12000);
    } else {
      ambientSoundBtn.classList.remove('is-playing');
      ambientSoundText.textContent = 'घाट ध्वनि';
      clearInterval(bellTimer);
      showToast('घाट ध्वनि बंद', 1800);
    }
  }

  ambientSoundBtn?.addEventListener('click', toggleAmbientSound);

  // ==========================================================================
  // PLAYER UI & TRACK DETAILS
  // ==========================================================================

  function updateSongUI(song) {
    if (!song) return;

    pillTitle.textContent = song.title;
    pillTitle.title = `${song.title} — ${song.artist}`;
    pillArtist.textContent = song.artist;
    document.title = `${song.title} — छठ घाट`;

    // Local cover with automatic fallback to YouTube HQ thumbnail
    const coverSrc = `covers/${song.id}.jpg`;
    pillArtImg.onerror = function () {
      this.onerror = null;
      this.src = `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`;
    };
    pillArtImg.src = coverSrc;

    // Reset progress fill
    pillFill.style.width = '0%';
    pillTime.textContent = '0:00 / 0:00';

    updateActiveSongInList();

    // Setup Media Session API (Mobile lockscreen & notifications)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: 'छठ घाट — Apna Bihar',
        artwork: [
          { src: `covers/${song.id}.jpg`, sizes: '512x512', type: 'image/jpeg' },
          { src: `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' }
        ]
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      navigator.mediaSession.setActionHandler('play', () => {
        if (bgAudioKeeper) bgAudioKeeper.play().catch(() => {});
        play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (bgAudioKeeper) bgAudioKeeper.pause();
        pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => prevSong(true));
      navigator.mediaSession.setActionHandler('nexttrack', () => nextSong(true));
      try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (player && details.seekTime) {
            player.seekTo(details.seekTime, true);
          }
        });
      } catch (e) {}
    }
  }

  function setPlayState(playing) {
    isPlaying = playing;
    if (playing) {
      pillArt.classList.add('is-spinning');
      playBtn.setAttribute('aria-label', 'रोकीं');
      playBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7.5 5h3.2v14H7.5Zm5.8 0h3.2v14h-3.2Z" fill="currentColor"></path>
        </svg>
      `;
      if (bgAudioKeeper) {
        bgAudioKeeper.play().catch(() => {});
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    } else {
      pillArt.classList.remove('is-spinning');
      playBtn.setAttribute('aria-label', 'बजाईं');
      playBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5.2 19 12 8 18.8Z" fill="currentColor"></path>
        </svg>
      `;
      if (bgAudioKeeper) {
        bgAudioKeeper.pause();
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    }
    updateActiveSongInList();
  }

  // ==========================================================================
  // YOUTUBE PLAYER INITIALIZATION & PLAYBACK
  // ==========================================================================

  window.onYouTubeIframeAPIReady = function () {
    const current = songs[currentIndex] || songs[0];
    player = new YT.Player('ytPlayer', {
      height: '180',
      width: '240',
      videoId: current.id,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        rel: 0,
        fs: 0,
        playsinline: 1,
        modestbranding: 1,
        iv_load_policy: 3,
        origin: window.location.origin
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    });
  };

  function onPlayerReady(event) {
    isPlayerReady = true;
    player.setVolume(100);
    player.unMute();
    const song = songs[currentIndex];
    updateSongUI(song);

    if (pendingPlaySongId) {
      player.loadVideoById(pendingPlaySongId);
      player.playVideo();
      setPlayState(true);
      pendingPlaySongId = null;
    }
  }

  function onPlayerStateChange(event) {
    if (event.data === 1) { // PLAYING
      setPlayState(true);
      duration = player.getDuration() || 0;
      startTimeTracking();
    } else if (event.data === 2) { // PAUSED
      // Check if pause occurred because phone screen was turned off / locked
      if (isPlaying && document.hidden) {
        // Keep playing in background on screen lock!
        if (bgAudioKeeper) bgAudioKeeper.play().catch(() => {});
        setTimeout(() => {
          if (isPlaying && player && typeof player.playVideo === 'function') {
            try { player.playVideo(); } catch (e) {}
          }
        }, 120);
        return;
      }
      setPlayState(false);
    } else if (event.data === 0) { // ENDED
      nextSong(true);
    }
  }

  function onPlayerError(event) {
    console.warn(`[छठ घाट] Video error ${event.data} on: ${songs[currentIndex]?.title}`);
    showToast('अगला गाना लोड हो रहल बा...', 2000);
    setTimeout(() => nextSong(true), 600);
  }

  // Ensure audio session and player remain active across screen off / tab hide
  document.addEventListener('visibilitychange', () => {
    if (isPlaying) {
      if (bgAudioKeeper) bgAudioKeeper.play().catch(() => {});
      if (player && typeof player.playVideo === 'function') {
        try { player.playVideo(); } catch (e) {}
      }
    }
  });

  window.addEventListener('pagehide', () => {
    if (isPlaying && bgAudioKeeper) {
      bgAudioKeeper.play().catch(() => {});
    }
  });

  // ==========================================================================
  // DIRECT 1-TAP INSTANT PLAYBACK (FIXES NO-PLAY ON SELECTION)
  // ==========================================================================

  function playSongByIndex(index, autoPlay = true) {
    if (index < 0 || index >= songs.length) return;
    currentIndex = index;
    const song = songs[currentIndex];
    updateSongUI(song);

    if (bgAudioKeeper) {
      bgAudioKeeper.play().catch(() => {});
    }

    // DIRECT INSTANT PLAYBACK:
    if (player && typeof player.loadVideoById === 'function') {
      try {
        player.loadVideoById({
          videoId: song.id,
          startSeconds: 0
        });
        player.unMute();
        player.setVolume(100);
        player.playVideo();
      } catch (e) {
        player.loadVideoById(song.id);
        player.playVideo();
      }
    } else {
      pendingPlaySongId = song.id;
    }

    setPlayState(true);
    startTimeTracking();
    showToast(`बज रहल बा: ${song.title}`, 2400);
  }

  function play() {
    if (!player) return;
    if (bgAudioKeeper) {
      bgAudioKeeper.play().catch(() => {});
    }
    try {
      player.unMute();
      player.playVideo();
      setPlayState(true);
    } catch (e) {}
  }

  function pause() {
    if (!player) return;
    if (bgAudioKeeper) {
      bgAudioKeeper.pause();
    }
    try {
      player.pauseVideo();
      setPlayState(false);
    } catch (e) {}
  }

  function togglePlay() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function nextSong(autoPlay = true) {
    if (isShuffle) {
      let nextIdx = Math.floor(Math.random() * songs.length);
      if (songs.length > 1 && nextIdx === currentIndex) {
        nextIdx = (currentIndex + 1) % songs.length;
      }
      playSongByIndex(nextIdx, autoPlay);
    } else {
      const nextIdx = (currentIndex + 1) % songs.length;
      playSongByIndex(nextIdx, autoPlay);
    }
  }

  function prevSong(autoPlay = true) {
    if (player && typeof player.getCurrentTime === 'function' && player.getCurrentTime() > 3) {
      player.seekTo(0, true);
      return;
    }
    const prevIdx = (currentIndex - 1 + songs.length) % songs.length;
    playSongByIndex(prevIdx, autoPlay);
  }

  // ==========================================================================
  // TIME TRACKING & TOUCH SCRUBBING
  // ==========================================================================

  function startTimeTracking() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
      if (!player || isDraggingSeek || typeof player.getCurrentTime !== 'function') return;
      currentTime = player.getCurrentTime() || 0;
      const dur = player.getDuration() || duration || 0;
      if (dur > 0) duration = dur;

      const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
      pillFill.style.width = `${pct}%`;
      pillTime.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }, 200);
  }

  function handleSeek(e) {
    const rect = pillSeek.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    pillFill.style.width = `${ratio * 100}%`;
    if (duration > 0) {
      const target = ratio * duration;
      pillTime.textContent = `${formatTime(target)} / ${formatTime(duration)}`;
    }
    return ratio;
  }

  pillSeek.addEventListener('click', (e) => {
    const ratio = handleSeek(e);
    if (player && duration > 0) {
      player.seekTo(ratio * duration, true);
    }
  });

  pillSeek.addEventListener('touchstart', (e) => {
    isDraggingSeek = true;
    handleSeek(e);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDraggingSeek) return;
    handleSeek(e);
  }, { passive: true });

  window.addEventListener('touchend', () => {
    if (!isDraggingSeek) return;
    isDraggingSeek = false;
    const ratio = parseFloat(pillFill.style.width) / 100;
    if (player && duration > 0) {
      player.seekTo(ratio * duration, true);
    }
  });

  // Pill control events
  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    nextSong(true);
  });
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    prevSong(true);
  });
  pillArt.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  // ==========================================================================
  // PLAYLIST SHEET SLIDE-UP & TOUCH INTERACTION (ZERO SHRINKING)
  // ==========================================================================

  function togglePlaylistSheet() {
    const isOpen = playlistSheet.classList.contains('is-open');
    if (isOpen) {
      closePlaylistSheet();
    } else {
      openPlaylistSheet();
    }
  }

  function openPlaylistSheet() {
    playlistSheet.classList.add('is-open');
    playlistToggleBtn.classList.add('is-active');
    renderSongsList();
    scrollActiveSongIntoView();
  }

  function closePlaylistSheet() {
    playlistSheet.classList.remove('is-open');
    playlistToggleBtn.classList.remove('is-active');
  }

  playlistToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlaylistSheet();
  });

  pillMetaToggle.addEventListener('click', (e) => {
    // If not clicking seek bar, open sheet
    if (e.target.closest('#pillSeek')) return;
    togglePlaylistSheet();
  });

  closeExpandedBtn?.addEventListener('click', closePlaylistSheet);
  sheetBackdrop?.addEventListener('click', closePlaylistSheet);

  // Swipe/drag down to close sheet on touch screens
  let touchStartY = 0;
  const sheetContent = playlistSheet?.querySelector('.playlist-sheet-content');
  if (sheetContent) {
    sheetContent.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    sheetContent.addEventListener('touchmove', (e) => {
      const touchY = e.touches[0].clientY;
      const diff = touchY - touchStartY;
      if (diff > 90 && expandedSongList.scrollTop <= 0) {
        closePlaylistSheet();
      }
    }, { passive: true });
  }

  // Shuffle toggle button in sheet header
  shuffleToggleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleToggleBtn.classList.toggle('is-active', isShuffle);
    shuffleStatusText.textContent = isShuffle ? 'शफल' : 'क्रमवार';
    showToast(isShuffle ? 'शफल मोड चालू' : 'क्रमवार मोड चालू', 1800);
  });

  // ==========================================================================
  // SONG LIST RENDERING, SEARCH & FILTERING
  // ==========================================================================

  let activeSingerFilter = 'all';
  let searchQuery = '';

  function getFilteredSongs() {
    return songs.map((song, originalIdx) => ({ song, originalIdx })).filter(({ song }) => {
      // Favorite filter
      if (activeSingerFilter === 'favs') {
        if (!favorites.has(song.id)) return false;
      } else if (activeSingerFilter !== 'all') {
        if (!song.artist.toLowerCase().includes(activeSingerFilter.toLowerCase())) {
          return false;
        }
      }

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchTitle = song.title.toLowerCase().includes(q);
        const matchArtist = song.artist.toLowerCase().includes(q);
        if (!matchTitle && !matchArtist) return false;
      }

      return true;
    });
  }

  function renderSongsList() {
    const filtered = getFilteredSongs();
    expandedSongList.innerHTML = '';

    if (filtered.length === 0) {
      expandedSongList.innerHTML = `
        <div style="text-align:center; padding:3rem 1rem; color:rgba(255,255,255,0.5); font-size:0.875rem;">
          <p style="margin:0 0 0.4rem; font-size:1.1rem;">कवनो गाना ना मिलल 🔍</p>
          <span>कृपया दूसरा नाम या गायक खोजें</span>
        </div>
      `;
      return;
    }

    filtered.forEach(({ song, originalIdx }, displayIdx) => {
      const card = document.createElement('div');
      card.className = `song-card ${originalIdx === currentIndex ? 'is-active' : ''}`;
      card.setAttribute('data-index', originalIdx);

      const trackNum = String(displayIdx + 1).padStart(2, '0');
      const isFav = favorites.has(song.id);

      card.innerHTML = `
        <span class="song-num">${trackNum}</span>
        <div class="equalizer-wave">
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
        </div>
        <div class="song-thumb">
          <img src="covers/${song.id}.jpg" alt="" loading="lazy" onerror="this.onerror=null; this.src='https://i.ytimg.com/vi/${song.id}/mqdefault.jpg';" />
        </div>
        <div class="song-details">
          <p class="song-title">${escapeHTML(song.title)}</p>
          <p class="song-artist">${escapeHTML(song.artist)}</p>
        </div>
        <button type="button" class="song-fav-btn ${isFav ? 'is-fav' : ''}" title="पसंदीदा (Favorite)" data-id="${song.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
        <div class="song-play-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.2 19 12 8 18.8Z"></path>
          </svg>
        </div>
      `;

      // DIRECT 1-TAP PLAY: Click card to play immediately!
      card.addEventListener('click', (e) => {
        if (e.target.closest('.song-fav-btn')) return;
        playSongByIndex(originalIdx, true);
      });

      // Favorite toggle
      const favBtn = card.querySelector('.song-fav-btn');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(song.id, favBtn);
      });

      expandedSongList.appendChild(card);
    });

    if (expandedCountBadge) {
      expandedCountBadge.textContent = `${filtered.length} / ${songs.length} छठ गीत`;
    }
  }

  function toggleFavorite(id, btn) {
    if (favorites.has(id)) {
      favorites.delete(id);
      btn.classList.remove('is-fav');
      btn.querySelector('svg').setAttribute('fill', 'none');
      showToast('पसंदीदा से हटावल गइल', 1600);
    } else {
      favorites.add(id);
      btn.classList.add('is-fav');
      btn.querySelector('svg').setAttribute('fill', 'currentColor');
      showToast('पसंदीदा में जोड़ल गइल ❤️', 1600);
    }
    try {
      localStorage.setItem('apnabihar_favs', JSON.stringify(Array.from(favorites)));
    } catch (e) {}

    if (activeSingerFilter === 'favs') {
      renderSongsList();
    }
  }

  function updateActiveSongInList() {
    const cards = expandedSongList.querySelectorAll('.song-card');
    cards.forEach((card) => {
      const idx = parseInt(card.getAttribute('data-index'), 10);
      if (idx === currentIndex) {
        card.classList.add('is-active');
      } else {
        card.classList.remove('is-active');
      }
    });
  }

  function scrollActiveSongIntoView() {
    setTimeout(() => {
      const activeCard = expandedSongList.querySelector('.song-card.is-active');
      if (activeCard) {
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
  }

  // Search input events
  songSearchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchClearBtn) {
      if (searchQuery.length > 0) searchClearBtn.classList.add('visible');
      else searchClearBtn.classList.remove('visible');
    }
    renderSongsList();
  });

  searchClearBtn?.addEventListener('click', () => {
    songSearchInput.value = '';
    searchQuery = '';
    searchClearBtn.classList.remove('visible');
    renderSongsList();
    songSearchInput.focus();
  });

  // Singer filter chips
  singerChips?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip-btn');
    if (!chip) return;
    singerChips.querySelectorAll('.chip-btn').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    activeSingerFilter = chip.getAttribute('data-filter') || 'all';
    renderSongsList();
  });

  // ==========================================================================
  // KEYBOARD SHORTCUTS & CREDIT
  // ==========================================================================

  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      nextSong(true);
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      prevSong(true);
    } else if (e.key.toLowerCase() === 'l' || e.key.toLowerCase() === 'p') {
      e.preventDefault();
      togglePlaylistSheet();
    }
  });

  rohanCredit?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('छठ पूजा के पावन अवसर पर Rohan द्वारा निर्मित ❤️', 3500);
  });

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial UI Setup
  if (songs.length > 0) {
    updateSongUI(songs[currentIndex]);
    if (queueBadge) queueBadge.textContent = songs.length;
  }

  // Load YouTube IFrame API script
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.id = 'yt-iframe-api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

})();
