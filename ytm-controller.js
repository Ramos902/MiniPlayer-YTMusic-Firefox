/**
 * Mini Player - YouTube Music & YouTube Content Script Controller
 * Monitora e controla com precisão a barra de reprodução (ytmusic-player-bar) e o player do YouTube.
 */

(() => {
  if (window.__YTM_CONTROLLER_INJECTED__) return;
  window.__YTM_CONTROLLER_INJECTED__ = true;

  // No YouTube Music web, o botão de shuffle embaralha a fila sob demanda.
  // Mantemos o estado sincronizado para indicar visualmente no Mini Player quando a fila foi embaralhada.
  let isQueueShuffled = false;
  let lastTrackTitle = "";

  function getVideo() {
    return document.querySelector("video");
  }

  function getPlayerBar() {
    return document.querySelector("ytmusic-player-bar");
  }

  // Executa exatamente UM clique limpo no elemento correto (sem duplicar eventos no Polymer/Lit)
  function singleClick(el) {
    if (!el) return false;

    let target = el;
    // Se for um container como <yt-button-shape>, buscamos o <button> nativo dentro dele
    if (el.tagName !== "BUTTON" && el.tagName !== "TP-YT-PAPER-ICON-BUTTON") {
      const innerBtn =
        el.querySelector("button") ||
        (el.shadowRoot && el.shadowRoot.querySelector("button"));
      if (innerBtn) {
        target = innerBtn;
      }
    }

    try {
      target.click();
      return true;
    } catch {
      try {
        const raw = target.wrappedJSObject || target;
        raw.click();
        return true;
      } catch {
        return false;
      }
    }
  }

  // Localiza os botões de Like e Dislike EXCLUSIVAMENTE dentro da barra do player (ytmusic-player-bar)
  function getYtmLikeDislikeElements() {
    const playerBar = getPlayerBar();
    if (!playerBar) return { renderer: null, likeBtn: null, dislikeBtn: null };

    const renderer = playerBar.querySelector(
      "ytmusic-like-button-renderer, #like-button-renderer"
    );
    if (!renderer) return { renderer: null, likeBtn: null, dislikeBtn: null };

    const likeBtn =
      renderer.querySelector("#button-shape-like button") ||
      renderer.querySelector("#button-shape-like") ||
      renderer.querySelector("tp-yt-paper-icon-button.like") ||
      renderer.querySelector(".like button") ||
      renderer.querySelector(".like");

    const dislikeBtn =
      renderer.querySelector("#button-shape-dislike button") ||
      renderer.querySelector("#button-shape-dislike") ||
      renderer.querySelector("tp-yt-paper-icon-button.dislike") ||
      renderer.querySelector(".dislike button") ||
      renderer.querySelector(".dislike");

    return { renderer, likeBtn, dislikeBtn };
  }

  // Localiza os botões de Like e Dislike no YouTube tradicional (www.youtube.com)
  function getYtLikeDislikeElements() {
    const likeBtn =
      document.querySelector("ytd-watch-metadata like-button-view-model button") ||
      document.querySelector("ytd-watch-metadata #segmented-like-button button") ||
      document.querySelector("#top-level-buttons-computed like-button-view-model button") ||
      document.querySelector("like-button-view-model button");

    const dislikeBtn =
      document.querySelector("ytd-watch-metadata dislike-button-view-model button") ||
      document.querySelector("ytd-watch-metadata #segmented-dislike-button button") ||
      document.querySelector("#top-level-buttons-computed dislike-button-view-model button") ||
      document.querySelector("dislike-button-view-model button");

    return { likeBtn, dislikeBtn };
  }

  function getLikeStatus() {
    const isYTM = window.location.hostname.includes("music.youtube.com");

    if (isYTM) {
      const { renderer, likeBtn, dislikeBtn } = getYtmLikeDislikeElements();
      if (!renderer) return { isLiked: false, isDisliked: false };

      // 1. Verifica a propriedade/atributo oficial like-status do ytmusic-like-button-renderer da player-bar
      const rawRenderer = renderer.wrappedJSObject || renderer;
      const status = rawRenderer.likeStatus || renderer.getAttribute("like-status");
      if (status === "LIKE") return { isLiked: true, isDisliked: false };
      if (status === "DISLIKE") return { isLiked: false, isDisliked: true };
      if (status === "INDIFFERENT") {
        // Confirma também via aria-pressed caso o DOM tenha acabado de atualizar
        const likePressed = likeBtn && likeBtn.getAttribute("aria-pressed") === "true";
        const dislikePressed = dislikeBtn && dislikeBtn.getAttribute("aria-pressed") === "true";
        return { isLiked: !!likePressed, isDisliked: !!dislikePressed };
      }

      // 2. Fallback via aria-pressed nos botões específicos da player-bar
      const isLiked = likeBtn ? likeBtn.getAttribute("aria-pressed") === "true" : false;
      const isDisliked = dislikeBtn ? dislikeBtn.getAttribute("aria-pressed") === "true" : false;
      return { isLiked, isDisliked };
    } else {
      const { likeBtn, dislikeBtn } = getYtLikeDislikeElements();
      const isLiked = likeBtn ? likeBtn.getAttribute("aria-pressed") === "true" : false;
      const isDisliked = dislikeBtn ? dislikeBtn.getAttribute("aria-pressed") === "true" : false;
      return { isLiked, isDisliked };
    }
  }

  function triggerLike() {
    const isYTM = window.location.hostname.includes("music.youtube.com");
    if (isYTM) {
      const { likeBtn } = getYtmLikeDislikeElements();
      return singleClick(likeBtn);
    } else {
      const { likeBtn } = getYtLikeDislikeElements();
      return singleClick(likeBtn);
    }
  }

  function triggerDislike() {
    const isYTM = window.location.hostname.includes("music.youtube.com");
    if (isYTM) {
      const { dislikeBtn } = getYtmLikeDislikeElements();
      return singleClick(dislikeBtn);
    } else {
      const { dislikeBtn } = getYtLikeDislikeElements();
      return singleClick(dislikeBtn);
    }
  }

  function getShuffleButton() {
    const isYTM = window.location.hostname.includes("music.youtube.com");
    if (isYTM) {
      const playerBar = getPlayerBar();
      if (!playerBar) return null;
      return (
        playerBar.querySelector("tp-yt-paper-icon-button.shuffle") ||
        playerBar.querySelector(".shuffle button") ||
        playerBar.querySelector(".shuffle") ||
        playerBar.querySelector("#shuffle-button")
      );
    } else {
      return (
        document.querySelector("ytd-playlist-panel-renderer #playlist-action-menu button[aria-label*='Aleat' i]") ||
        document.querySelector("ytd-playlist-panel-renderer #playlist-action-menu button[aria-label*='Shuffle' i]") ||
        document.querySelector("ytd-playlist-panel-renderer #playlist-action-menu ytd-toggle-button-renderer:first-of-type button")
      );
    }
  }

  function getRepeatButton() {
    const isYTM = window.location.hostname.includes("music.youtube.com");
    if (isYTM) {
      const playerBar = getPlayerBar();
      if (!playerBar) return null;
      return (
        playerBar.querySelector("tp-yt-paper-icon-button.repeat") ||
        playerBar.querySelector(".repeat button") ||
        playerBar.querySelector(".repeat") ||
        playerBar.querySelector("#repeat-button")
      );
    } else {
      return (
        document.querySelector("ytd-playlist-panel-renderer #playlist-action-menu button[aria-label*='Repet' i]") ||
        document.querySelector("ytd-playlist-panel-renderer #playlist-action-menu button[aria-label*='Loop' i]")
      );
    }
  }

  function triggerShuffle() {
    const isYTM = window.location.hostname.includes("music.youtube.com");
    const shuffleBtn = getShuffleButton();

    if (isYTM) {
      if (!shuffleBtn) return false;
      isQueueShuffled = !isQueueShuffled;
      // No YouTube Music, o botão embaralha a fila imediatamente ao ativar
      if (isQueueShuffled) {
        singleClick(shuffleBtn);
      }
      return true;
    } else {
      if (shuffleBtn) {
        return singleClick(shuffleBtn);
      }
      return false;
    }
  }

  function triggerRepeat() {
    const isYTM = window.location.hostname.includes("music.youtube.com");
    const repeatBtn = getRepeatButton();

    if (isYTM) {
      return singleClick(repeatBtn);
    } else {
      if (repeatBtn) {
        return singleClick(repeatBtn);
      }
      // Em vídeos avulsos do YouTube, alterna o loop nativo do vídeo
      const video = getVideo();
      if (video) {
        video.loop = !video.loop;
        return true;
      }
      return false;
    }
  }

  function getShuffleRepeatStatus() {
    const isYTM = window.location.hostname.includes("music.youtube.com");

    if (isYTM) {
      const playerBar = getPlayerBar();
      if (!playerBar) {
        return { isShuffle: false, isRepeat: false, repeatMode: "NONE" };
      }

      // Repeat no YTM usa o atributo repeat-mode="NONE" | "ALL" | "ONE" na ytmusic-player-bar
      const rawBar = playerBar.wrappedJSObject || playerBar;
      const repeatAttr = (
        rawBar.repeatMode ||
        playerBar.getAttribute("repeat-mode") ||
        "NONE"
      ).toUpperCase();

      const isRepeat = repeatAttr === "ALL" || repeatAttr === "ONE";
      const repeatMode = isRepeat ? repeatAttr : "NONE";

      // Shuffle no YTM: verifica atributo shuffle-on ou estado sincronizado
      const hasShuffleAttr =
        playerBar.hasAttribute("shuffle-on") ||
        playerBar.getAttribute("shuffle-on") === "true" ||
        Boolean(rawBar.shuffleOn);

      const isShuffle = hasShuffleAttr || isQueueShuffled;

      return { isShuffle, isRepeat, repeatMode };
    } else {
      const shuffleBtn = getShuffleButton();
      const isShuffle = shuffleBtn
        ? shuffleBtn.getAttribute("aria-pressed") === "true"
        : false;

      const repeatBtn = getRepeatButton();
      const video = getVideo();
      let isRepeat = false;
      let repeatMode = "NONE";

      if (repeatBtn && repeatBtn.getAttribute("aria-pressed") === "true") {
        isRepeat = true;
        repeatMode = "ALL";
      } else if (video && video.loop) {
        isRepeat = true;
        repeatMode = "ONE";
      }

      return { isShuffle, isRepeat, repeatMode };
    }
  }

  // Escuta cliques diretos no botão shuffle da página do YTM para manter o indicador sincronizado
  document.addEventListener(
    "click",
    (e) => {
      if (!e.isTrusted) return;
      const path = e.composedPath ? e.composedPath() : [];
      const clickedShuffle = path.some(
        (node) =>
          node &&
          node.classList &&
          (node.classList.contains("shuffle") || node.id === "shuffle-button")
      );
      if (clickedShuffle) {
        isQueueShuffled = true;
      }
    },
    true
  );

  function upgradeArtworkUrl(url) {
    if (!url) return "";
    // Melhora a resolução da miniatura do Google/YTM (de w60-h60 para w300-h300)
    return url.replace(/=w\d+-h\d+/g, "=w300-h300");
  }

  function getMetadata() {
    const isYTM = window.location.hostname.includes("music.youtube.com");
    const video = getVideo();
    const playerBar = getPlayerBar();

    let title = "";
    let artist = "";
    let artwork = "";

    if (isYTM && playerBar) {
      const titleEl =
        playerBar.querySelector(".title") ||
        playerBar.querySelector(".middle-controls .title");
      title = titleEl ? titleEl.textContent.trim() : "";

      const bylineEl = playerBar.querySelector(".byline");
      artist = bylineEl ? bylineEl.textContent.trim() : "";

      const imgEl =
        playerBar.querySelector(".image") || playerBar.querySelector("img");
      if (imgEl && imgEl.src && !imgEl.src.startsWith("data:image/gif")) {
        artwork = upgradeArtworkUrl(imgEl.src);
      }
    } else {
      const titleEl =
        document.querySelector("h1.ytd-watch-metadata yt-formatted-string") ||
        document.querySelector(".title.ytd-video-primary-info-renderer");
      title = titleEl ? titleEl.textContent.trim() : "";

      const channelEl =
        document.querySelector("#channel-name #text") ||
        document.querySelector(".ytd-channel-name a");
      artist = channelEl ? channelEl.textContent.trim() : "";
    }

    // Fallbacks via MediaSession API
    if (navigator.mediaSession && navigator.mediaSession.metadata) {
      const meta = navigator.mediaSession.metadata;
      if (!title && meta.title) title = meta.title;
      if (!artist && meta.artist) artist = meta.artist;
      if (!artwork && meta.artwork && meta.artwork.length > 0) {
        artwork = upgradeArtworkUrl(meta.artwork[meta.artwork.length - 1].src);
      }
    }

    if (!title) {
      title =
        document.title.replace(/\s*-\s*YouTube( Music)?$/i, "").trim() ||
        "Nenhuma faixa selecionada";
    }

    lastTrackTitle = title;

    const { isLiked, isDisliked } = getLikeStatus();
    const { isShuffle, isRepeat, repeatMode } = getShuffleRepeatStatus();

    const currentTime = video ? video.currentTime : 0;
    const duration =
      video && !isNaN(video.duration) && isFinite(video.duration)
        ? video.duration
        : 0;
    const isPlaying = video ? !video.paused && !video.ended : false;
    const volume = video ? (video.muted ? 0 : video.volume) : 1;
    const speed = video ? video.playbackRate : 1;

    return {
      title,
      artist,
      artwork,
      currentTime,
      duration,
      isPlaying,
      volume,
      speed,
      isLiked,
      isDisliked,
      isShuffle,
      isRepeat,
      repeatMode
    };
  }

  async function getLyrics() {
    const readLyricsDom = () => {
      const lyricsEl =
        document.querySelector(
          "ytmusic-tab-renderer[page-type='MUSIC_PAGE_TYPE_TRACK_LYRICS'] .description.ytmusic-description-shelf-renderer"
        ) ||
        document.querySelector(".description.ytmusic-description-shelf-renderer") ||
        document.querySelector(
          "ytmusic-tab-renderer[page-type='MUSIC_PAGE_TYPE_TRACK_LYRICS'] yt-formatted-string.non-expandable"
        );
      if (lyricsEl && lyricsEl.innerText && lyricsEl.innerText.trim().length > 5) {
        return lyricsEl.innerText.trim();
      }
      return null;
    };

    let text = readLyricsDom();
    if (text) return text;

    // Se a aba de Letras ainda não foi aberta no YouTube Music, tenta clicar nela para carregar
    const tabs = document.querySelectorAll("ytmusic-player-page tp-yt-paper-tab");
    if (tabs.length >= 2) {
      const lyricsTab = tabs[1];
      const isDisabled =
        lyricsTab.hasAttribute("disabled") ||
        lyricsTab.getAttribute("aria-disabled") === "true";
      if (!isDisabled) {
        singleClick(lyricsTab);
        await new Promise((r) => setTimeout(r, 450));
        text = readLyricsDom();
        if (text) return text;
      }
    }

    return "Letra não disponível para esta faixa no momento.";
  }

  // Listener para comandos da extensão
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const video = getVideo();
    const playerBar = getPlayerBar();

    switch (message.command) {
      case "GET_STATE":
        sendResponse(getMetadata());
        break;

      case "PLAY_PAUSE": {
        const btn =
          (playerBar && playerBar.querySelector("#play-pause-button")) ||
          document.querySelector("#play-pause-button") ||
          document.querySelector(".ytp-play-button");
        if (btn) {
          singleClick(btn);
        } else if (video) {
          if (video.paused) video.play();
          else video.pause();
        }
        setTimeout(() => sendResponse(getMetadata()), 150);
        return true;
      }

      case "PAUSE": {
        if (video && !video.paused) {
          const btn =
            (playerBar && playerBar.querySelector("#play-pause-button")) ||
            document.querySelector("#play-pause-button") ||
            document.querySelector(".ytp-play-button");
          if (btn) {
            singleClick(btn);
          } else {
            video.pause();
          }
        }
        setTimeout(() => sendResponse(getMetadata()), 150);
        return true;
      }

      case "NEXT": {
        const nextBtn =
          (playerBar && playerBar.querySelector(".next-button")) ||
          document.querySelector(".next-button") ||
          document.querySelector(".ytp-next-button");
        if (nextBtn) singleClick(nextBtn);
        setTimeout(() => sendResponse(getMetadata()), 250);
        return true;
      }

      case "PREV": {
        const prevBtn =
          (playerBar && playerBar.querySelector(".previous-button")) ||
          document.querySelector(".previous-button") ||
          document.querySelector(".ytp-prev-button");

        const isPrevDisabled =
          !prevBtn ||
          prevBtn.getAttribute("aria-disabled") === "true" ||
          prevBtn.style.display === "none";

        if (!isPrevDisabled) {
          singleClick(prevBtn);
        } else if (video) {
          video.currentTime = 0;
        }
        setTimeout(() => sendResponse(getMetadata()), 250);
        return true;
      }

      case "SEEK": {
        if (video && typeof message.time === "number") {
          const maxTime =
            video.duration && !isNaN(video.duration) ? video.duration : 10000;
          video.currentTime = Math.max(0, Math.min(maxTime, message.time));
        }
        sendResponse(getMetadata());
        break;
      }

      case "SEEK_RELATIVE": {
        if (video && typeof message.delta === "number") {
          const maxTime =
            video.duration && !isNaN(video.duration) ? video.duration : 10000;
          video.currentTime = Math.max(
            0,
            Math.min(maxTime, video.currentTime + message.delta)
          );
        }
        sendResponse(getMetadata());
        break;
      }

      case "SET_VOLUME": {
        if (video && typeof message.volume === "number") {
          const vol = Math.max(0, Math.min(1, message.volume));
          video.volume = vol;
          video.muted = vol === 0;

          // Sincroniza também o slider interno da barra do YTM se existir
          if (playerBar) {
            const slider = playerBar.querySelector(
              "#volume-slider, #expand-volume-slider"
            );
            if (slider) {
              try {
                const rawSlider = slider.wrappedJSObject || slider;
                rawSlider.value = Math.round(vol * 100);
              } catch {}
            }
          }
        }
        sendResponse(getMetadata());
        break;
      }

      case "SET_SPEED": {
        if (video && typeof message.speed === "number") {
          video.playbackRate = message.speed;
        }
        sendResponse(getMetadata());
        break;
      }

      case "TOGGLE_LIKE": {
        triggerLike();
        setTimeout(() => sendResponse(getMetadata()), 250);
        return true;
      }

      case "TOGGLE_DISLIKE": {
        triggerDislike();
        setTimeout(() => sendResponse(getMetadata()), 250);
        return true;
      }

      case "TOGGLE_SHUFFLE": {
        triggerShuffle();
        setTimeout(() => sendResponse(getMetadata()), 200);
        return true;
      }

      case "TOGGLE_REPEAT": {
        triggerRepeat();
        setTimeout(() => sendResponse(getMetadata()), 200);
        return true;
      }

      case "GET_LYRICS": {
        getLyrics().then((lyrics) => sendResponse({ lyrics }));
        return true;
      }
    }
  });
})();
