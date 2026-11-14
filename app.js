/**
 * छठ घाट — Bihari Nostalgia Radio
 * Cloned & Enhanced for Rohan
 */

(function () {
  'use strict';

  // --- Global State ---
  const songs = window.SONGS || [];
  let playlist = [...songs];
  let currentIndex = 0;
  let player = null;
  let isPlayerReady = false;
  let isPlaying = false;
  let isShuffle = true;
  let isLoop = false;
  let currentTime = 0;
  let duration = 0;
  let progressInterval = null;
  let isDraggingSeek = false;
  let consecutiveErrors = 0;

  // --- DOM Elements ---
  const artContainer = document.getElementById('pillArt');
  const artImg = document.getElementById('pillArtImg');
  const songTitleEl = document.getElementById('pillTitle');
  const songArtistEl = document.getElementById('pillArtist');
  const seekBtn = document.getElementById('pillSeek');
  const fillBar = document.getElementById('pillFill');
  const timeDisplay = document.getElementById('pillTime');
  const playBtn = document.getElementById('playBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const onlineCountEl = document.getElementById('onlineCount');

  // Playlist drawer elements
  const playlistDrawer = document.getElementById('playlistDrawer');
  const playlistBackdrop = document.getElementById('playlistBackdrop');
  const openPlaylistBtn = document.getElementById('openPlaylistBtn');
  const playlistPillBtn = document.getElementById('playlistPillBtn');
  const closePlaylistBtn = document.getElementById('closePlaylistBtn');
  const playlistItemsContainer = document.getElementById('playlistItems');
  const searchInput = document.getElementById('playlistSearch');
  const searchClear = document.getElementById('searchClear');
  const chipsContainer = document.getElementById('playlistChips');
  const shuffleBtn = document.getElementById('shuffleActionBtn');
  const totalSongsCount = document.getElementById('totalSongsCount');

  // Suggestion modal elements
  const suggestBtn = document.getElementById('suggestBtn');
  const suggestModal = document.getElementById('suggestModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const suggestForm = document.getElementById('suggestForm');
  const suggestSuccess = document.getElementById('suggestSuccess');
  const submitAnotherBtn = document.getElementById('submitAnotherBtn');

  // Credit & Toast
  const rohanCredit = document.getElementById('rohanCredit');
  const toastEl = document.getElementById('toast');

  // --- Shuffle helper (Fisher-Yates) ---
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Initial random song pick
  if (isShuffle && songs.length > 0) {
    currentIndex = Math.floor(Math.random() * songs.length);
  }

  // --- Format Seconds into M:SS ---
  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // --- Toast notification ---
  let toastTimer = null;
  function showToast(msg, durationMs = 3000) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, durationMs);
  }

  // --- Online Presence Simulator ---
  let currentOnline = 34 + Math.floor(Math.random() * 8);
  if (onlineCountEl) onlineCountEl.textContent = currentOnline;

  setInterval(() => {
    const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
    currentOnline = Math.max(28, Math.min(52, currentOnline + change));
    if (onlineCountEl) onlineCountEl.textContent = currentOnline;
  }, 16000);

  // --- Update UI with Current Song Details ---
  function updateSongUI(song) {
    if (!song) return;

    songTitleEl.textContent = song.title;
    songTitleEl.title = `${song.title} — ${song.artist}`;
    songArtistEl.textContent = song.artist;
    document.title = `${song.title} — छठ घाट`;

    // Local cover with automatic fallback to YouTube HQ thumbnail
    const coverSrc = `covers/${song.id}.jpg`;
    artImg.onerror = function () {
      this.onerror = null;
      this.src = `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`;
    };
    artImg.src = coverSrc;

    // Reset progress
    fillBar.style.width = '0%';
    timeDisplay.textContent = '0:00 / 0:00';

    // Update active state in playlist drawer
    updateActivePlaylistItem();

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
      navigator.mediaSession.setActionHandler('play', () => play());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
    }
  }

  function setPlayState(playing) {
    isPlaying = playing;
    if (playing) {
      artContainer.classList.add('is-spinning');
      playBtn.setAttribute('aria-label', 'रोकीं');
      playBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7.5 5h3.2v14H7.5Zm5.8 0h3.2v14h-3.2Z" fill="currentColor"></path>
        </svg>
      `;
    } else {
      artContainer.classList.remove('is-spinning');
      playBtn.setAttribute('aria-label', 'बजाईं');
      playBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5.2 19 12 8 18.8Z" fill="currentColor"></path>
        </svg>
      `;
    }
    updateActivePlaylistItem();
  }

  // --- YouTube IFrame API Setup (Privacy & Ad-Free Host) ---
  window.onYouTubeIframeAPIReady = function () {
    const current = songs[currentIndex] || songs[0];
    player = new YT.Player('ytPlayer', {
      height: '1',
      width: '1',
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
    const song = songs[currentIndex];
    updateSongUI(song);
  }

  function onPlayerStateChange(event) {
    // YT.PlayerState: PLAYING = 1, PAUSED = 2, ENDED = 0, BUFFERING = 3
    if (event.data === 1) {
      consecutiveErrors = 0;
      setPlayState(true);
      duration = player.getDuration() || 0;
      startTimeTracking();
    } else if (event.data === 2) {
      setPlayState(false);
    } else if (event.data === 0) {
      // Song finished
      if (isLoop) {
        player.seekTo(0, true);
        player.playVideo();
      } else {
        nextSong(true);
      }
    }
  }

  function onPlayerError(event) {
    console.warn(`[छठ घाट] YouTube error code ${event.data} on song ${songs[currentIndex]?.title}`);
    consecutiveErrors++;
    if (consecutiveErrors < songs.length) {
      showToast('अगला गाना लोड हो रहा है...', 2000);
      setTimeout(() => nextSong(true), 600);
    } else {
      showToast('कवनो गाना लोड ना हो पावल', 4000);
      setPlayState(false);
    }
  }

  // --- Playback Controls ---
  function play() {
    if (!isPlayerReady || !player) return;
    player.playVideo();
    setPlayState(true);
  }

  function pause() {
    if (!isPlayerReady || !player) return;
    player.pauseVideo();
    setPlayState(false);
  }

  function togglePlay() {
    if (!isPlayerReady || !player) return;
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function playSongByIndex(index, autoPlay = true) {
    if (index < 0 || index >= songs.length) return;
    currentIndex = index;
    const song = songs[currentIndex];
    updateSongUI(song);

    if (player && typeof player.loadVideoById === 'function') {
      if (autoPlay) {
        player.loadVideoById(song.id);
        setPlayState(true);
      } else {
        player.cueVideoById(song.id);
        setPlayState(false);
      }
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
    // If more than 3 seconds in, restart current song
    if (player && typeof player.getCurrentTime === 'function' && player.getCurrentTime() > 3) {
      player.seekTo(0, true);
      return;
    }
    const prevIdx = (currentIndex - 1 + songs.length) % songs.length;
    playSongByIndex(prevIdx, autoPlay);
  }

  // --- Time Progress & Seeking ---
  function startTimeTracking() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
      if (!isPlayerReady || !player || isDraggingSeek) return;
      if (typeof player.getCurrentTime === 'function') {
        currentTime = player.getCurrentTime() || 0;
        const dur = player.getDuration() || duration || 0;
        if (dur > 0) duration = dur;

        const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
        fillBar.style.width = `${pct}%`;
        timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
      }
    }, 200);
  }

  function handleSeek(e) {
    const rect = seekBtn.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    fillBar.style.width = `${ratio * 100}%`;
    if (duration > 0) {
      const targetTime = ratio * duration;
      timeDisplay.textContent = `${formatTime(targetTime)} / ${formatTime(duration)}`;
    }
    return ratio;
  }

  seekBtn.addEventListener('click', (e) => {
    const ratio = handleSeek(e);
    if (player && typeof player.seekTo === 'function' && duration > 0) {
      player.seekTo(ratio * duration, true);
      currentTime = ratio * duration;
    }
  });

  // Touch scrubbing support for phones
  seekBtn.addEventListener('touchstart', (e) => {
    isDraggingSeek = true;
    handleSeek(e);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDraggingSeek) return;
    handleSeek(e);
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (!isDraggingSeek) return;
    isDraggingSeek = false;
    const ratio = parseFloat(fillBar.style.width) / 100;
    if (player && typeof player.seekTo === 'function' && duration > 0) {
      player.seekTo(ratio * duration, true);
    }
  });

  // --- Event Listeners for Player Pill ---
  playBtn.addEventListener('click', togglePlay);
  nextBtn.addEventListener('click', () => nextSong(true));
  prevBtn.addEventListener('click', () => prevSong(true));
  artContainer.addEventListener('click', togglePlay);

  // --- Keyboard Shortcuts ---
  window.addEventListener('keydown', (e) => {
    const isTyping = e.target.closest('input, textarea, select');
    if (isTyping) return;

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
      togglePlaylistDrawer();
    }
  });

  // ==========================================================================
  // PLAYLIST DRAWER RENDERING & SEARCH
  // ==========================================================================

  let activeArtistFilter = 'all';
  let searchQuery = '';

  // Filter songs based on search and artist chip
  function getFilteredSongs() {
    return songs.map((song, originalIdx) => ({ song, originalIdx })).filter(({ song }) => {
      const matchesArtist = activeArtistFilter === 'all' || song.artist.toLowerCase().includes(activeArtistFilter.toLowerCase());
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q);
      return matchesArtist && matchesSearch;
    });
  }

  function renderPlaylist() {
    const filtered = getFilteredSongs();
    playlistItemsContainer.innerHTML = '';

    if (filtered.length === 0) {
      playlistItemsContainer.innerHTML = `
        <div class="playlist-empty">
          <p>कवनो गाना ना मिलल 🔍</p>
          <span style="font-size:0.8rem;opacity:0.7;">कृपया दूसरा नाम या गायक खोजें</span>
        </div>
      `;
      return;
    }

    filtered.forEach(({ song, originalIdx }, displayIdx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `song-card ${originalIdx === currentIndex ? 'is-active' : ''}`;
      card.setAttribute('data-index', originalIdx);
      card.setAttribute('aria-label', `${song.title} — ${song.artist}`);

      const trackNum = String(displayIdx + 1).padStart(2, '0');

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
        <div class="song-play-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.2 19 12 8 18.8Z"></path>
          </svg>
        </div>
      `;

      card.addEventListener('click', () => {
        playSongByIndex(originalIdx, true);
        showToast(`बज रहल बा: ${song.title}`, 2200);
      });

      playlistItemsContainer.appendChild(card);
    });

    if (totalSongsCount) {
      totalSongsCount.textContent = `${filtered.length} / ${songs.length} छठ गीत`;
    }
  }

  function updateActivePlaylistItem() {
    const cards = playlistItemsContainer.querySelectorAll('.song-card');
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
      const activeCard = playlistItemsContainer.querySelector('.song-card.is-active');
      if (activeCard) {
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
  }

  function togglePlaylistDrawer() {
    const isOpen = playlistDrawer.classList.contains('is-open');
    if (isOpen) {
      closePlaylist();
    } else {
      openPlaylist();
    }
  }

  function openPlaylist() {
    playlistDrawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    renderPlaylist();
    scrollActiveSongIntoView();
  }

  function closePlaylist() {
    playlistDrawer.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // Drawer events
  openPlaylistBtn?.addEventListener('click', togglePlaylistDrawer);
  playlistPillBtn?.addEventListener('click', togglePlaylistDrawer);
  closePlaylistBtn?.addEventListener('click', closePlaylist);
  playlistBackdrop?.addEventListener('click', closePlaylist);

  // Search input events
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchClear) {
      if (searchQuery.length > 0) searchClear.classList.add('visible');
      else searchClear.classList.remove('visible');
    }
    renderPlaylist();
  });

  searchClear?.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.classList.remove('visible');
    renderPlaylist();
    searchInput.focus();
  });

  // Artist filter chips
  chipsContainer?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip-btn');
    if (!chip) return;
    chipsContainer.querySelectorAll('.chip-btn').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    activeArtistFilter = chip.getAttribute('data-filter') || 'all';
    renderPlaylist();
  });

  // Shuffle toggle button in drawer
  shuffleBtn?.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('is-active', isShuffle);
    shuffleBtn.innerHTML = isShuffle
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"></path></svg> 🔀 रैंडम चालू`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"></path></svg> 🔁 क्रमवार`;
    showToast(isShuffle ? 'शफल मोड चालू' : 'क्रमवार मोड चालू', 1800);
  });

  // ==========================================================================
  // SUGGESTION MODAL LOGIC
  // ==========================================================================

  function openSuggestModal() {
    suggestModal.classList.add('is-open');
  }

  function closeSuggestModal() {
    suggestModal.classList.remove('is-open');
    setTimeout(() => {
      suggestForm.style.display = 'block';
      suggestSuccess.classList.remove('visible');
    }, 300);
  }

  suggestBtn?.addEventListener('click', openSuggestModal);
  modalCloseBtn?.addEventListener('click', closeSuggestModal);
  modalBackdrop?.addEventListener('click', closeSuggestModal);

  suggestForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const songName = document.getElementById('suggestSongName')?.value || '';
    const singer = document.getElementById('suggestSinger')?.value || '';
    const link = document.getElementById('suggestLink')?.value || '';
    const user = document.getElementById('suggestUser')?.value || 'अज्ञात';

    const suggestionObj = {
      songName,
      singer,
      link,
      user,
      timestamp: new Date().toISOString()
    };

    // Save to localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('apnabihar_suggestions') || '[]');
      stored.push(suggestionObj);
      localStorage.setItem('apnabihar_suggestions', JSON.stringify(stored));
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }

    // Display confirmation
    suggestForm.style.display = 'none';
    suggestSuccess.classList.add('visible');
    showToast('सुझाव भेजल गइल! धन्यवाद ❤️', 3000);
  });

  submitAnotherBtn?.addEventListener('click', () => {
    suggestForm.reset();
    suggestForm.style.display = 'block';
    suggestSuccess.classList.remove('visible');
  });

  // ==========================================================================
  // MADE BY ROHAN CREDIT INTERACTION
  // ==========================================================================

  rohanCredit?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('छठ पूजा के पावन अवसर पर Rohan द्वारा निर्मित ❤️', 3500);
  });

  // Utility HTML Escape
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial song load into UI
  if (songs.length > 0) {
    updateSongUI(songs[currentIndex]);
  }

  // Load YouTube IFrame API script
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.id = 'yt-iframe-api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

})();
