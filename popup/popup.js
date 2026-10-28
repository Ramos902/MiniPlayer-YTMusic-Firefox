/**
 * Mini Player - YouTube Music Popup Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elementos do DOM
  const playerCard = document.getElementById("player-card");
  const noMusicView = document.getElementById("no-music-view");
  const playerMain = document.getElementById("player-main");
  const btnOpenYtm = document.getElementById("btn-open-ytm");

  const trackArt = document.getElementById("track-art");
  const artworkPlaceholder = document.getElementById("artwork-placeholder");
  const trackTitle = document.getElementById("track-title");
  const trackArtist = document.getElementById("track-artist");
  const trackTime = document.getElementById("track-time");

  const btnDislike = document.getElementById("btn-dislike");
  const btnLike = document.getElementById("btn-like");
  const btnShuffle = document.getElementById("btn-shuffle");
  const btnRepeat = document.getElementById("btn-repeat");
  const repeatBadge = document.getElementById("repeat-badge");

  const progressBarContainer = document.getElementById("progress-bar-container");
  const progressBarFill = document.getElementById("progress-bar-fill");

  const btnPrev = document.getElementById("btn-prev");
  const btnRewind = document.getElementById("btn-rewind");
  const btnPlayPause = document.getElementById("btn-play-pause");
  const iconPlay = document.getElementById("icon-play");
  const iconPause = document.getElementById("icon-pause");
  const btnForward = document.getElementById("btn-forward");
  const btnNext = document.getElementById("btn-next");

  const btnMute = document.getElementById("btn-mute");
  const iconVolHigh = document.getElementById("icon-vol-high");
  const iconVolMuted = document.getElementById("icon-vol-muted");
  const volSliderContainer = document.getElementById("volume-slider-container");
  const volSliderFill = document.getElementById("volume-slider-fill");
  const volHandle = document.getElementById("volume-handle");

  const selectSpeed = document.getElementById("select-speed");
  const selectSleepTimer = document.getElementById("select-sleep-timer");

  const btnToggleLyrics = document.getElementById("btn-toggle-lyrics");
  const lyricsDrawer = document.getElementById("lyrics-drawer");
  const lyricsContent = document.getElementById("lyrics-content");
  const lyricsArrow = document.getElementById("lyrics-arrow");

  const btnDetach = document.getElementById("btn-detach");
  const btnFocusTab = document.getElementById("btn-focus-tab");
  const btnCompactMode = document.getElementById("btn-compact-mode");
  const btnExpandMode = document.getElementById("btn-expand-mode");

  let currentDuration = 0;
  let currentTrackTitle = "";
  let isSeeking = false;
  let isDraggingProgress = false;
  let isDraggingVolume = false;
  let lastVolume = 1;
  let lastUserActionTime = 0;

  const isDetachedWindow = window.location.search.includes("detached=true");
  if (isDetachedWindow) {
    btnDetach.style.display = "none";
  }

  // Alterna entre o modo completo e o modo resumido (compacto)
  function setCompactMode(isCompact) {
    if (!playerCard) return;
    playerCard.classList.toggle("compact-mode", Boolean(isCompact));
    try {
      localStorage.setItem("ytm_mini_player_compact", isCompact ? "1" : "0");
    } catch {}

    if (isDetachedWindow && browser.windows && browser.windows.getCurrent) {
      browser.windows.getCurrent().then((win) => {
        if (win && win.id) {
          browser.windows.update(win.id, {
            height: isCompact ? 132 : 460
          });
        }
      }).catch(() => {});
    }
  }

  // Restaura modo compacto se o usuário deixou ativo anteriormente
  try {
    if (localStorage.getItem("ytm_mini_player_compact") === "1") {
      setCompactMode(true);
    }
  } catch {}

  // Sincroniza estado inicial do Sleep Timer salvo no background
  browser.runtime
    .sendMessage({ action: "GET_SLEEP_TIMER" })
    .then((res) => {
      if (res && typeof res.minutes === "number") {
        selectSleepTimer.value = String(res.minutes);
      }
    })
    .catch(() => {});

  // Formatação de tempo em m:ss
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  // Envia comando para a aba do YouTube Music
  async function sendCommand(command, payload = {}) {
    if (command !== "GET_STATE" && command !== "GET_LYRICS") {
      lastUserActionTime = Date.now();
    }
    try {
      const response = await browser.runtime.sendMessage({
        action: "SEND_PLAYER_COMMAND",
        payload: { command, ...payload }
      });
      if (response && !response.error && command !== "GET_LYRICS") {
        updateUI(response);
      }
      return response;
    } catch (err) {
      console.warn("Erro ao enviar comando:", err);
      return null;
    }
  }

  // Atualiza a letra se a gaveta estiver aberta
  async function refreshLyrics() {
    lyricsContent.textContent = "Buscando letra...";
    const res = await sendCommand("GET_LYRICS");
    lyricsContent.textContent =
      res?.lyrics || "Letra não disponível para esta faixa.";
  }

  // Atualiza a interface com os dados recebidos do YouTube Music
  function updateUI(state) {
    if (!state || (!state.title && !state.artist && state.duration === 0)) {
      noMusicView.style.display = "flex";
      playerMain.style.display = "none";
      return;
    }

    noMusicView.style.display = "none";
    playerMain.style.display = "block";

    const newTitle = state.title || "Sem título";
    const trackChanged = currentTrackTitle && currentTrackTitle !== newTitle;
    currentTrackTitle = newTitle;

    trackTitle.textContent = newTitle;
    trackArtist.textContent = state.artist || "Artista desconhecido";
    trackArt.title = `${newTitle} — ${state.artist || ""}`;

    // Se a faixa mudou e o painel de letra estiver aberto, atualiza a letra automaticamente
    if (trackChanged && lyricsDrawer.style.display !== "none") {
      refreshLyrics();
    }

    // Capa do álbum
    if (state.artwork) {
      if (trackArt.src !== state.artwork) {
        trackArt.src = state.artwork;
      }
      trackArt.style.display = "block";
      artworkPlaceholder.style.display = "none";
    } else {
      trackArt.style.display = "none";
      artworkPlaceholder.style.display = "flex";
    }

    currentDuration = state.duration || 0;

    // Tempo e barra de progresso (só atualiza se o usuário não estiver arrastando)
    if (!isSeeking && !isDraggingProgress) {
      trackTime.textContent = `${formatTime(state.currentTime)} / ${formatTime(state.duration)}`;
      const percent =
        state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
      progressBarFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }

    // Play / Pause
    if (state.isPlaying) {
      iconPlay.style.display = "none";
      iconPause.style.display = "block";
    } else {
      iconPlay.style.display = "block";
      iconPause.style.display = "none";
    }

    // Like / Dislike
    btnLike.classList.toggle("active", Boolean(state.isLiked));
    btnDislike.classList.toggle("active", Boolean(state.isDisliked));

    // Shuffle / Repeat (com badge '1' quando em modo Repeat One)
    btnShuffle.classList.toggle("active", Boolean(state.isShuffle));
    btnRepeat.classList.toggle("active", Boolean(state.isRepeat));
    if (repeatBadge) {
      repeatBadge.style.display = state.repeatMode === "ONE" ? "flex" : "none";
    }

    // Volume (só atualiza se o usuário não estiver arrastando no momento)
    if (!isDraggingVolume) {
      const vol = typeof state.volume === "number" ? state.volume : 1;
      volSliderFill.style.width = `${vol * 100}%`;
      if (volHandle) {
        volHandle.style.left = `${vol * 100}%`;
      }

      if (vol > 0) {
        lastVolume = vol;
        iconVolHigh.style.display = "block";
        iconVolMuted.style.display = "none";
      } else {
        iconVolHigh.style.display = "none";
        iconVolMuted.style.display = "block";
      }
    }

    // Velocidade
    if (state.speed) {
      selectSpeed.value = state.speed.toString();
    }
  }

  // Consulta o estado do player (ignora se uma ação do usuário acabou de ocorrer há menos de 650ms)
  async function fetchState(force = false) {
    if (!force && Date.now() - lastUserActionTime < 650) {
      return;
    }
    const res = await sendCommand("GET_STATE");
    if (!res || res.error) {
      noMusicView.style.display = "flex";
      playerMain.style.display = "none";
    }
  }

  // Polling a cada 800ms enquanto o popup estiver aberto
  fetchState(true);
  const pollInterval = setInterval(() => fetchState(false), 800);
  window.addEventListener("unload", () => clearInterval(pollInterval));

  // Cliques nos Controles Principais
  btnPlayPause.addEventListener("click", () => {
    const isCurrentlyPlaying = iconPlay.style.display === "none";
    iconPlay.style.display = isCurrentlyPlaying ? "block" : "none";
    iconPause.style.display = isCurrentlyPlaying ? "none" : "block";
    sendCommand("PLAY_PAUSE");
  });

  btnNext.addEventListener("click", () => sendCommand("NEXT"));
  btnPrev.addEventListener("click", () => sendCommand("PREV"));
  btnRewind.addEventListener("click", () =>
    sendCommand("SEEK_RELATIVE", { delta: -10 })
  );
  btnForward.addEventListener("click", () =>
    sendCommand("SEEK_RELATIVE", { delta: 10 })
  );

  // Like / Dislike / Shuffle / Repeat (com feedback otimista instantâneo)
  btnLike.addEventListener("click", () => {
    const isLiked = btnLike.classList.toggle("active");
    if (isLiked) btnDislike.classList.remove("active");
    sendCommand("TOGGLE_LIKE");
  });

  btnDislike.addEventListener("click", () => {
    const isDisliked = btnDislike.classList.toggle("active");
    if (isDisliked) btnLike.classList.remove("active");
    sendCommand("TOGGLE_DISLIKE");
  });

  btnShuffle.addEventListener("click", () => {
    btnShuffle.classList.toggle("active");
    sendCommand("TOGGLE_SHUFFLE");
  });

  btnRepeat.addEventListener("click", () => {
    btnRepeat.classList.add("active");
    sendCommand("TOGGLE_REPEAT");
  });

  // --- CONTROLE DE VOLUME CORRIDO E ARRASTÁVEL (DRAG & DROP) ---
  function handleVolumeInput(e) {
    const rect = volSliderContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const volume = Math.max(0, Math.min(1, clickX / rect.width));

    volSliderFill.style.width = `${volume * 100}%`;
    if (volHandle) {
      volHandle.style.left = `${volume * 100}%`;
    }

    if (volume > 0) {
      lastVolume = volume;
      iconVolHigh.style.display = "block";
      iconVolMuted.style.display = "none";
    } else {
      iconVolHigh.style.display = "none";
      iconVolMuted.style.display = "block";
    }

    sendCommand("SET_VOLUME", { volume });
  }

  volSliderContainer.addEventListener("pointerdown", (e) => {
    isDraggingVolume = true;
    volSliderContainer.setPointerCapture(e.pointerId);
    handleVolumeInput(e);
  });

  volSliderContainer.addEventListener("pointermove", (e) => {
    if (!isDraggingVolume) return;
    handleVolumeInput(e);
  });

  volSliderContainer.addEventListener("pointerup", (e) => {
    if (isDraggingVolume) {
      isDraggingVolume = false;
      try {
        volSliderContainer.releasePointerCapture(e.pointerId);
      } catch {}
      handleVolumeInput(e);
    }
  });

  volSliderContainer.addEventListener("pointercancel", () => {
    isDraggingVolume = false;
  });

  btnMute.addEventListener("click", () => {
    const currentVol = parseFloat(volSliderFill.style.width) / 100;
    if (currentVol > 0) {
      lastVolume = currentVol;
      sendCommand("SET_VOLUME", { volume: 0 });
    } else {
      sendCommand("SET_VOLUME", { volume: lastVolume || 1 });
    }
  });

  // --- BARRA DE PROGRESSO CORRIDA E ARRASTÁVEL (SCRUBBER) ---
  function handleProgressInput(e, commit = false) {
    if (currentDuration <= 0) return;
    const rect = progressBarContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percent * currentDuration;

    progressBarFill.style.width = `${percent * 100}%`;
    trackTime.textContent = `${formatTime(targetTime)} / ${formatTime(currentDuration)}`;

    if (commit) {
      sendCommand("SEEK", { time: targetTime });
    }
  }

  progressBarContainer.addEventListener("pointerdown", (e) => {
    isDraggingProgress = true;
    isSeeking = true;
    progressBarContainer.setPointerCapture(e.pointerId);
    handleProgressInput(e, true);
  });

  progressBarContainer.addEventListener("pointermove", (e) => {
    if (!isDraggingProgress) return;
    handleProgressInput(e, false);
  });

  progressBarContainer.addEventListener("pointerup", (e) => {
    if (isDraggingProgress) {
      isDraggingProgress = false;
      try {
        progressBarContainer.releasePointerCapture(e.pointerId);
      } catch {}
      handleProgressInput(e, true);
      setTimeout(() => {
        isSeeking = false;
      }, 300);
    }
  });

  progressBarContainer.addEventListener("pointercancel", () => {
    isDraggingProgress = false;
    isSeeking = false;
  });

  // Velocidade de reprodução
  selectSpeed.addEventListener("change", (e) => {
    const speed = parseFloat(e.target.value);
    sendCommand("SET_SPEED", { speed });
  });

  // Temporizador de desligamento (Sleep Timer)
  selectSleepTimer.addEventListener("change", (e) => {
    const minutes = parseInt(e.target.value, 10);
    browser.runtime.sendMessage({
      action: "SET_SLEEP_TIMER",
      minutes
    });
  });

  // Acordeão de Letra (Lyrics)
  btnToggleLyrics.addEventListener("click", async () => {
    const isOpen = lyricsDrawer.style.display !== "none";
    if (isOpen) {
      lyricsDrawer.style.display = "none";
      lyricsArrow.classList.remove("open");
    } else {
      lyricsDrawer.style.display = "block";
      lyricsArrow.classList.add("open");
      await refreshLyrics();
    }
  });

  // Ações do Cabeçalho
  btnDetach.addEventListener("click", () => {
    browser.runtime.sendMessage({ action: "OPEN_DETACHED_WINDOW" });
    window.close();
  });

  btnFocusTab.addEventListener("click", () => {
    browser.runtime.sendMessage({ action: "FOCUS_MUSIC_TAB" });
  });

  if (btnCompactMode) {
    btnCompactMode.addEventListener("click", () => setCompactMode(true));
  }

  if (btnExpandMode) {
    btnExpandMode.addEventListener("click", () => setCompactMode(false));
  }

  btnOpenYtm.addEventListener("click", () => {
    browser.runtime.sendMessage({ action: "OPEN_YOUTUBE_MUSIC" });
    window.close();
  });
});
