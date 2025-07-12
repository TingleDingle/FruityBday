// YT Player API
let player;
let isPlaying = false;

function onPlayerReady() {
    updateVideoInfo();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        updateVideoInfo();
    }
} 

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function getPlaylistVideoIds(playlistId) {
    const apiKey = 'AIzaSyAratsJKdAO4iWZyUCBizJMGaowJnOqAyc'; // Replace with your actual API key
    const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.items) {
            return data.items.map(item => item.contentDetails.videoId);
        } else {
            console.error('Error fetching playlist:', data);
            return [];
        }
    } catch (error) {
        console.error('Error fetching playlist:', error);
        return [];
    }
}

async function onYouTubeIframeAPIReady() {
    const ADO_PLAYLIST_ID = 'OLAK5uy_mT2KInkQZCW-n5okJvoqeBtNYeUb4bEUQ';
    const DAZBEE_PLAYLIST_ID = 'PLSQSRgGmmWo4vgfufqo9p-5Mt_ge4RjdJ';

    const adoVideoIds = await getPlaylistVideoIds(ADO_PLAYLIST_ID);
    const dazbeeVideoIds = await getPlaylistVideoIds(DAZBEE_PLAYLIST_ID);

    const allVideoIds = [...adoVideoIds, ...dazbeeVideoIds];

    const shuffledVideoIds = shuffleArray([...allVideoIds]); 

    player = new YT.Player('yt-player', {
        height: '100',
        width: '100',
        playerVars: {
            listType: 'playlist',
            playlist: shuffledVideoIds.join(','),
            autoplay: 1,
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });
}

function updateVideoInfo() {
    if (!player) return;

    const data = player.getVideoData();
    const title = data.title || 'Music';
    const artist = data.author || 'Unknown';
    const videoId = data.video_id || '';

    $('#video-title').text(title);
    $('#video-artist').text(artist);

    if (videoId) {
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        $('#video-thumbnail').attr('src', thumbnailUrl);
    }
}

function togglePlayPause() {
    if (!player) return;

    if (isPlaying) {
        player.pauseVideo();
        $('#playButton').removeClass('hidden');
        $('#pauseButton').addClass('hidden');
    } else {
        player.playVideo();
        $('#playButton').addClass('hidden');
        $('#pauseButton').removeClass('hidden');
    }
    isPlaying = !isPlaying;
}

function nextVideo() {
    if (player) {
        player.nextVideo();
        setTimeout(() => {
            updateVideoInfo();
            if (!isPlaying) togglePlayPause();    
        }, 500);
    }
}

function prevVideo() {
    if (player) {
        player.previousVideo();
        setTimeout(() => {
            updateVideoInfo();
            if (!isPlaying) togglePlayPause();
        }, 500);
    }
}


// Messages Data
let messagesData = {};
let usersData = {};

let messageState;

const bannerDim = {
    height: 490,
    width: 872,
}
const MAX_IMAGE_PERCENT = 0.1;
const IMAGE_SIZE = 50;

class MessageState {
    constructor(messagesData, bannerDim) {
        this.messagesData = messagesData;
        this.bannerDim = bannerDim;
        this.selectedIndex = null;
        this.side = null; // 'left' or 'right'
        this.overlayElement = null;
    }

    selectUser(index) {
        this.removeOverlay();

        if (this.selectedIndex === index) {
            this.deselectUser();
            return;
        }

        this.selectedIndex = index;
        this.side = this.getSide(index);
        this.addOverlay();
    }

    deselectUser() {
        this.selectedIndex = null;
        this.side = null;
        this.removeOverlay();
    }

    getSide(index) {
        const message = this.messagesData[index];
        const x = message.position.x;
        const bannerWidth = this.bannerDim.width;

        return x < bannerWidth / 2 ? 'right' : 'left';
    }

    addOverlay() {
        if (this.selectedIndex === null) return;

        const side = this.side;
        const message = this.messagesData[this.selectedIndex];
        const bannerContainer = $('#banner-container');

        this.overlayElement = $('<div>')
            .attr('id', 'side-overlay')
            .addClass(`side-overlay-${side}`)
            .append(
                $('<p>')
                    .text(message.msg_content.text)
                    .addClass('overlay-text')
            )
            .append(
                $('<p>')
                    .text(`- ${message.name}`)
                    .addClass('overlay-name')
            )
            .appendTo(bannerContainer);
    }

    removeOverlay() {
        if (this.overlayElement) {
            this.overlayElement.remove();
            this.overlayElement = null;
        }
    }
}

async function loadData() {
    try {
        const messagesResponse = await fetch('./data/messages.json');
        messagesData = await messagesResponse.json();

        const usersResponse = await fetch('./data/users.json');
        usersData = await usersResponse.json();

        console.log('Messages Data:', messagesData);
        console.log('Users Data:', usersData);

        messageState = new MessageState(messagesData, bannerDim);

        messagesData.forEach((message, index) => { // Assuming messagesData has a 'messages' array
            const position = message.position;

            const pfpImage = $('<img>')
                .on('click', () => messageState && messageState.selectUser(index))
                .attr('src', message.pfp_url)
                .addClass('pfp-image');

            const pfpText = $('<p>')
                .text(message.name)
                .addClass('pfp-name')

            const pfpContainer = $('<div>')
                .attr('id', `pfp-${index}`)
                .addClass('pfp-container')
                .css({
                    'width': `${IMAGE_SIZE}px`,
                    'height': `${IMAGE_SIZE}px`,
                    'top': position.y + 'px', // Use message's y position
                    'left': position.x + 'px', // Use message's x position
                });

            if (message.placement === 'bottom') {
                pfpContainer.append(pfpImage).append(pfpText);
            }
            else {
                pfpContainer.append(pfpText).append(pfpImage);
            }

            $('#banner-container').append(pfpContainer);
        });
        updateDotPositions(); // Initial update
    } 
    catch (error) {
        console.error('Error loading data:', error);
    }
}

function throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;

    return function (...args) {
        const currentTime = new Date().getTime();

        if (!timeoutId) {
            if (currentTime - lastExecTime >= delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = new Date().getTime();
                    timeoutId = null;
                }, delay - (currentTime - lastExecTime));
            }
        }
    };
}

function updateDotPositions() {
    const bannerContainer = $('#banner-img');
    const currentWidth = bannerContainer.width();
    const currentHeight = bannerContainer.height();

    const xScale = currentWidth / bannerDim.width;
    const yScale = currentHeight / bannerDim.height;

    const imgSize = Math.min(
        Math.min(IMAGE_SIZE, currentHeight * MAX_IMAGE_PERCENT),
        Math.min(IMAGE_SIZE, currentWidth * MAX_IMAGE_PERCENT),
    );

    console.log(xScale, yScale);

    messagesData.forEach((message, index) => {
        const position = message.position;
        const pfp = $(`#pfp-${index}`);

        pfp.css({
            'width': `${imgSize}px`,
            'height': `${imgSize}px`, 
            'top': position.y * yScale + 'px',
            'left': position.x * xScale + 'px',
        });
    });
}

$(document).ready(function () {
    loadData();
    
    // Resize listener
    const bannerImg = document.getElementById('banner-img');
    const throttledUpdateDotPositions = throttle(updateDotPositions, 50); // Throttle the function

    const resizeObserver = new ResizeObserver(entries => {
        throttledUpdateDotPositions();
    });

    resizeObserver.observe(bannerImg);
});