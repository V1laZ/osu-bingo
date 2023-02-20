<template>
    <div class="main-page" :class="{'create': lobbyPopup_create}">
        <div class="profile-wrapper">
            <div @click="handleDropper" @focusout="handleDropper" tabindex="0" ref="profileImg_el" class="profile-img"></div>
            <div v-if="profileFocused" class="profile-dropper">
                <div @mousedown="logout" class="profile-dropper-line">
                    <p class="profile-dropper-content">Logout</p>
                    <i class="fa-solid fa-right-from-bracket logout"></i>
                </div>
            </div>
        </div>
        <div class="line-wrapper">
            <div class="mid-line"></div>
        </div>
        <div :class="{'d-none': lobbyPopup_create || lobbyPopup_join}" class="main-btns-container">
            <div class="lobby-btn-wrapper">
                <button class="lobby-btn join-lobby" @click="animateJoinLobby" type="button">Join Lobby</button>
            </div>
            <div class="lobby-btn-wrapper">
                <button class="lobby-btn create-lobby" @click="animateCreateLobby" type="button">Create Lobby</button>
            </div>
        </div>
        <div :class="{'d-none': !lobbyPopup_join}" class="main-btns-container">
            <div class="lobby-join-input-wrapper">
                <div class="lobby-input-container">
                    <input type="text" class="lobby-input" id="lobbyJoinInput" placeholder="Lobby ID" v-model="lobbyInput">
                </div>
                <p v-if="joinLobbyError.error" class="main-error-text">{{ joinLobbyError.msg }}</p>
            </div>
            <div class="lobby-btn-wrapper">
                <button class="lobby-btn join" @click="joinLobby" type="button">Join</button>
            </div>
        </div>
        <div :class="{'d-none': !lobbyPopup_create}" class="create-lobby-container">
            <div class="mappool-menu">
                <div class="mappool-menu-icon" tabindex="1" @click="menuIconAnim" @focusout="menuIconAnim">
                    <div class="menu-line menu-line1"></div>
                    <div class="menu-line menu-line2"></div>
                    <div class="menu-line menu-line3"></div>
                </div>
                <div class="mappool-dropper">
                    <div @mousedown="saveMappool" class="mappool-droppper-line">
                        <p class="mappool-dropper-text">Save Mappool</p>
                    </div>
                    <div @mousedown="$refs.loadMappoolRef.click()" class="mappool-droppper-line">
                        <input type="file" @change="loadMappool" ref="loadMappoolRef" style="display: none">
                        <p class="mappool-dropper-text">Load Mappool</p>
                    </div>
                </div>
            </div>
            <div class="mappool-container-create">
                <div class="create-map-box" v-for="i in 25" :key="i" 
                        :data-index="i - 1"
                        @click="loadMapInput"
                        :class="{'focused': lastFocusMapIndex == i - 1}"
                    >
                </div>
            </div>
            <div class="create-lobby-right-wrapper">
                <div class="map-inputs-wrapper" v-if="lastFocusMapIndex">
                    <input type="text" class="add-map-input" v-model="mapIdInput" placeholder="Map ID">
                    <p v-if="mapInputError.error" class="main-error-text map-input-error">{{ mapInputError.msg }}</p>
                    <button class="confirm-btn" type="button" @click="setMapInput">Confirm</button>
                </div>
            </div>
            <div class="create-lobby-error-wrapper">
                <p v-if="createLobbyError.error" class="main-error-text create-lobby-error-text">{{ createLobbyError.msg }}</p>
            </div>
        </div>
        <div :class="{'d-none': !lobbyPopup_create}" class="create-btn-wrapper">
            <button class="create-btn" @click="createLobby" type="button">Create</button>
        </div>
        <div :class="{'d-none': lobbyPopup_create == lobbyPopup_join, 'joinH': lobbyPopup_join}" class="back-btn-wrapper">
            <button class="back-btn" @click="animateBack" type="button">Back</button>
        </div>
    </div>
</template>

<script setup>
import anime from 'animejs/lib/anime.es.js'

const token = useCookie('access_token')
const user = useCookie('username')
if (!token.value || !user.value) {
    navigateTo('/login')
}

const supabase = useSupabaseClient()
const config = useRuntimeConfig()

// /^[0-9]+$/.exec(id) regex for mappool IDs

const lobbyPopup_join = ref(false)
const lobbyInput = ref("")
const joinLobbyError = ref({})
const mapInputError = ref({})
const createLobbyError = ref({})
const lobbyPopup_create = ref(false)
const mapIdInput = ref("")
const loading = ref(false)
const mapIdsArr = ref(Array(25).fill(null))
const lastFocusMapIndex = ref(null)
const lastFocusMap = ref(null)
const profileFocused = ref(false)
const menuIconClicked = ref(false)
const profileImg_el = ref()
const loadMappoolRef = ref()

onMounted(() => {
    profileImg_el.value.style['background-image'] = `url(${window.localStorage.getItem('profile-img')})`
})

function makeTextFile(text) {
    const data = new Blob([text], {type: 'text/plain'});

    const textFile = window.URL.createObjectURL(data);

    return textFile
}

function loadThumbnails(beatmaps) {
    const mapboxes = document.querySelectorAll('.create-map-box')

    let i = 0
    let add_beatmap = 0
    mapboxes.forEach((mapbox) => {
        if (mapIdsArr.value[i]) {
            mapbox.style['background-image'] = `url(${beatmaps[add_beatmap].beatmapset.covers.list})`
            add_beatmap++
        }
        i++
    })
}

function loadMappool() {
    const fr = new FileReader()

    fr.readAsText(loadMappoolRef.value.files[0])

    fr.addEventListener('load', async () => {
        let loadedMappool
        try {
            loadedMappool = JSON.parse(fr.result)
        } catch (error) {
            createLobbyError.value = {error: true, msg: "Something went wrong"}
            setTimeout(() => createLobbyError.value.error = false, 3000)
            return false
        }

        const mapIds = loadedMappool.filter((map) => map)
        mapIdsArr.value = loadedMappool
        
        const mapped_params = mapIds.map((mapId) => {
            return `ids%5B%5D=${mapId}`
        })
        const req_query = mapped_params.join('&')
        
        const headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.value}`
        }
        
        const {data: res_beatmaps} = await useFetch(`${config.APP_PATH}/api/beatmaps/${req_query}`, {headers: headers})
        
        loadThumbnails(res_beatmaps.value.beatmaps)
    })
}

function saveMappool() {
    let link = document.createElement('a');
    link.setAttribute('download', 'mappool.json');
    link.href = makeTextFile(JSON.stringify(mapIdsArr.value));
    document.body.appendChild(link);

    // wait for the link to be added to the document
    window.requestAnimationFrame(function () {
        var event = new MouseEvent('click');
        link.dispatchEvent(event);
        document.body.removeChild(link);
    });
}

function menuIconAnim(event) {
    if (event.type == "focusout" && !menuIconClicked.value) {
        return
    }
    
    menuIconClicked.value = !menuIconClicked.value


    if (menuIconClicked.value) {
        anime({
            targets: '.menu-line1',
            top: '13px',
            rotate: '-45deg',
            easing: 'easeInOutCubic',
            duration: '400'
        })

        anime({
            targets: '.menu-line3',
            top: '-10.5px',
            rotate: '45deg',
            easing: 'easeInOutCubic',
            duration: '400'
        })

        anime({
            targets: '.menu-line2',
            opacity: 0,
            easing: 'easeInOutCubic',
            duration: '400'
        })

        anime({
            targets: '.mappool-dropper',
            opacity: 1,
            height: '78px',
            padding: '2px',
            easing: 'easeInOutCubic',
            duration: '400'
        })

        return
    }

    if (!menuIconClicked.value) {
        anime({
            targets: '.menu-line1',
            top: '0px',
            rotate: '0deg',
            easing: 'easeInOutCubic',
            duration: '400'
        })

        anime({
            targets: '.menu-line3',
            top: '0px',
            rotate: '0deg',
            easing: 'easeInOutCubic',
            duration: '400'
        })

        anime({
            targets: '.menu-line2',
            opacity: 1,
            easing: 'easeInOutCubic',
            duration: '400'
        })

        anime({
            targets: '.mappool-dropper',
            opacity: 0,
            height: '0px',
            padding: '0px',
            easing: 'easeInOutCubic',
            duration: '400'
        })

        return
    }


}

function logout() {
    window.localStorage.clear()
    token.value = null
    navigateTo('/login')
}

function handleDropper(event) {
    if (event.type == "click") {
        if (profileFocused.value) {
            document.querySelector('.profile-img').blur()
            profileFocused.value = false
            return
        }
        profileFocused.value = !profileFocused.value
    }

    if (event.type == "focusout") {
        profileFocused.value = false
    }
}

function loadMapInput(map_el) {
    const map_index = map_el.target.getAttribute("data-index")
    mapIdInput.value = mapIdsArr.value[map_index]
    lastFocusMapIndex.value = map_index
    mapInputError.value = {error: false, msg: ""}
    lastFocusMap.value = map_el

    setTimeout(() => {
        const map_input = document.querySelector('.add-map-input')
        map_input.focus()
        map_input.scrollIntoView({
            behavior: 'smooth'
        })
    }, 5)
}

async function setMapInput() {
    if (mapIdInput.value == mapIdsArr.value[lastFocusMapIndex.value]) {
        lastFocusMapIndex.value = null
        mapIdInput.value = null
        return
    }

    if (mapIdInput.value == "") {
        mapIdsArr.value[lastFocusMapIndex.value] = null
        lastFocusMapIndex.value = null
        mapIdInput.value = null
        lastFocusMap.value.target.style['background-image'] = ""
        return
    }

    if (!(/^[0-9]+$/.exec(mapIdInput.value))) {
        mapInputError.value = {error: true, msg: "Enter valid map ID"}
        return
    }

    mapIdsArr.value[lastFocusMapIndex.value] = mapIdInput.value

    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        Authorization: `Bearer ${token.value}`
    }

    const { data: fetchBeatmap, error } = await useFetch(`${config.APP_PATH}/api/beatmap/${mapIdInput.value}`, {headers: headers})

    const cover_bg = fetchBeatmap.value.beatmapset.covers.list

    lastFocusMap.value.target.style['background-image'] = `url(${cover_bg})`

    lastFocusMapIndex.value = null
    mapIdInput.value = null
}

function resetErrors() {
    joinLobbyError.value = {error: false, msg: ""}
    createLobbyError.value = {error: false, msg: ""}
    mapInputError.value = {error: false, msg: ""}
}

function animateJoinLobby() {
    const tl = anime.timeline({
        easing: 'easeInCubic',
        duration: 500
    })

    tl.add({
        targets: '.create-lobby',
        top: '-100px',
    }, 0)

    tl.add({
        targets: '.join-lobby',
        top: '100px',
        complete: () => {
            lobbyPopup_join.value = true
        }
    }, 0)

    
    tl.add({
        targets: '.join',
        top: ['-100px', '0px']
    }, 500)
    
    tl.add({
        targets: '.lobby-input-container',
        top: ['100px', '0px']
    }, 500)
    
    tl.add({
        targets: '.mid-line',
        width: '0px',
        duration: 200,
        easing: 'easeInOutQuart'
    })

    tl.add({
        targets: '.back-btn',
        bottom: ['-90px', '0px'],
        duration: 200
    }, 500)


}

function animateBack() {
    resetErrors()
    if (lobbyPopup_create.value) {
        const top_perc = (100 / document.body.scrollHeight) * 100
        const width_px = document.body.clientWidth * 0.9
        
        const tl = anime.timeline({
            duration: 500
        })
    
        tl.add({
            targets: '.create-lobby-container',
            opacity: 0,
            duration: 200,
            complete: () => {
                lobbyPopup_create.value = false
            },
            easing: 'linear'
        })
    
        tl.add({
            targets: '.mid-line',
            top: [`${top_perc}%`, '50%'],
            width: [`${width_px}px`, '285px'],
            easing: 'easeInOutQuad',
        })
    
        tl.add({
            targets: ['.back-btn', '.create-btn'],
            bottom: ['0px', '-90px'],
            duration: 300
        }, 100)
    
        tl.add({
            targets: '.create-lobby',
            top: '0px',
            easing: 'easeOutQuart'
        }, 750)
    
        tl.add({
            targets: '.join-lobby',
            top: '0px',
            easing: 'easeOutQuart'
        }, 750)

        return
    }
    
    if (lobbyPopup_join.value) {
        const tl = anime.timeline({
            duration: 500,
            easing: 'easeInCubic',
        })

        tl.add({
            targets: '.mid-line',
            width: '285px',
            duration: 300,
            easing: 'easeInOutQuart'
        })

        tl.add({
            targets: '.join',
            top: ['-100px'],
        }, 0)

        tl.add({
            targets: '.lobby-input-container',
            top: ['100px'],
            complete: () => {
                lobbyPopup_join.value = false
            }
        }, 0)

        tl.add({
            targets: '.back-btn',
            bottom: ['0px', '-90px'],
            duration: 200
        }, 100)
    
        tl.add({
            targets: '.create-lobby',
            top: '0px',
            easing: 'easeOutQuart',
        }, 500)
    
        tl.add({
            targets: '.join-lobby',
            top: '0px',
            easing: 'easeOutQuart'
        }, 500)

        return
    }
}

function animateCreateLobby() {
    const top_px = document.body.scrollHeight * 0.5
    const width_px = document.body.clientWidth * 0.9

    const tl = anime.timeline({
        easing: 'easeInCubic',
        duration: 500
    })

    tl.add({
        targets: '.create-lobby',
        top: '-100px',
    }, 0)

    tl.add({
        targets: '.join-lobby',
        top: '100px'
    }, 0)

    tl.add({
        targets: '.mid-line',
        top: [`${top_px}px`, '100px'],
        width: `${width_px}px`,
        easing: 'easeInOutCubic',
        complete: () => {
            lobbyPopup_create.value = true
            document.querySelector('.mid-line').style.width = '90%'
        }
    })

    tl.add({
        targets: '.create-lobby-container',
        opacity: [0, 1],
        duration: 200
    })

    tl.add({
        targets: ['.back-btn', '.create-btn'],
        bottom: ['-90px', '0px'],
        duration: 200
    }, 500)
}

async function joinLobby() {
    if (!lobbyInput.value) {
        joinLobbyError.value = {error: true, msg: "Enter a valid lobby ID"}
        return false
    }

    if (!(/^[0-9]+$/.exec(lobbyInput.value))) {
        joinLobbyError.value = {error: true, msg: "Enter a valid lobby ID"}
        return false
    }

    const { data: fetchLobby } = await supabase.from('lobbies').select('players, started').eq('lobby_id', lobbyInput.value)

    if (!fetchLobby.length) {
        joinLobbyError.value = {error: true, msg: "This lobby doesn't exist"}
        return false
    }

    if (!fetchLobby.started) {
        joinLobbyError.value = {error: true, msg: "Lobby has already started"}
        return false
    }

    for (let i = 0; i < fetchLobby[0].players.length; i++) {
        const player = fetchLobby[0].players[i].player

        if (player == user.value) {
            return navigateTo(`/lobby/${lobbyInput.value}`)
            // joinLobbyError.value = {error: true, msg: "User already in the lobby"}
        }
        
    }

    if (fetchLobby[0].players.length >= 6) {
        joinLobbyError.value = {error: true, msg: "Lobby is full"}
        return false
    }

    let newPlayers = fetchLobby[0].players
    newPlayers.push({
        "player": user.value,
        "team": "red"
    })

    const { data, error } = await supabase.from('lobbies').update({ players: newPlayers}).eq('lobby_id', lobbyInput.value)

    await navigateTo(`/lobby/${lobbyInput.value}`)
}

async function createLobby() {
    loading.value = true
    const mappoolLength = mapIdsArr.value.filter((mapID) => mapID).length

    if (mappoolLength < 25) {
        createLobbyError.value = {error: true, msg: `Put ${25 - mappoolLength} more ${25 - mappoolLength == 1 ? "map" : "maps"}`}
        loading.value = false
        setTimeout(() => createLobbyError.value.error = false, 3000)
        return false
    }
    
    const mappool = mapIdsArr.value.map((map_id) => {
        return {
            "map_id": map_id,
            "player": "",
            "team": "",
            "score": 0
        }
    })

    const { data, error } = await supabase.from('lobbies').upsert({
        players: [{
            "player": user.value,
            "team": "red"
        }],
        mappool: mappool
    }).select('lobby_id')

    const lobby_id = data[0].lobby_id
    loading.value = false

    await navigateTo(`/lobby/${lobby_id}`)
}

</script>