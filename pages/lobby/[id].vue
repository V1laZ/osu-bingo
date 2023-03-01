<template>
    <div class="lobby-page">
        <Transition name="fade">
            <div v-if="lobby_status.ended" class="win-overlay">
                <p v-if="lobby_status.team_won.length > 0" class="team-won-text" :class="
                    {
                        'team-red-text': lobby_status.team_won == 'red',
                        'team-blue-text': lobby_status.team_won == 'blue',
                        'team-green-text': lobby_status.team_won == 'green',
                    }">{{ lobby_status.team_won }} TEAM WON! 
                </p>
                <p v-else class="team-won-text">
                    LOBBY ENDED!
                </p>
            </div>
        </Transition>
        <div class="lobby-top-rect">
            Lobby {{ lobby_id }}
        </div>
        <div class="lobby-wrapper">
            <div class="players-container">
                <div v-for="i in 6" :key="i" class="player-box">
                    <div v-if="players[i - 1]" class="player-wrapper">
                        <p class="player-text">{{ players[i - 1].player }}</p>
                        <div tabindex="1" class="player-team-icon" :class="
                            {
                                'team-red': players[i - 1].team == 'red',
                                'team-green': players[i - 1].team == 'green',
                                'team-blue': players[i - 1].team == 'blue',
                                'can-team-change': players[i - 1].player == user && !lobby_status.started
                            }">
                            <div v-if="(players[i - 1].player == user) && !(lobby_status.started)" class="player-team-dropdown" >
                                <div @click="changeTeam((i - 1), 'green',)" v-if="players[i - 1].team != 'green'" class="team-icon-select team-green"></div>
                                <div @click="changeTeam((i - 1), 'blue')" v-if="players[i - 1].team != 'blue'" class="team-icon-select team-blue"></div>
                                <div @click="changeTeam((i - 1), 'red')" v-if="players[i - 1].team != 'red'" class="team-icon-select team-red"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="(players[0].player == user) && !(lobby_status.started)" class="start-lobby-container">
                <button @click="startLobby" class="start-btn">Start</button>
            </div>
            <div v-if="!(players[0].player == user) && !(lobby_status.started)" class="start-lobby-container">
                <p class="waiting-text">Waiting for master to start the lobby</p>
            </div>
            <div v-if="lobby_status.started" class="mappool-wrapper">
                <div class="mappool-container">
                    <a :href="`https://osu.ppy.sh/b/${map.map_id}`" target="_blank" v-for="map in mappool" class="map-box" :class="
                        {
                            'team-red': map.team == 'red',
                            'team-green': map.team == 'green',
                            'team-blue': map.team == 'blue',
                        }">
                        <div v-if="map.score != 0" class="map-info-box">
                            <p class="map-info-box-text"><b>Player:</b> {{ map.player }}</p>
                            <p class="map-info-box-text"><b>Score:</b> {{ map.score.toLocaleString('en-US') }}</p>
                        </div>
                    </a>
                </div>
                <div class="submit-wrapper">
                    <button @click="submitPlay" :disabled="lobby_status.ended" class="submit-play-btn">Submit play</button>
                    <p v-if="submitting" class="submitting-text">Submitting ...</p>
                    <p v-if="submitError" class="submit-error-text">{{ submitError.msg }}</p>
                </div>
            </div>
        </div>
        <button @click="leaveLobby" class="quit-btn">Leave</button>
    </div>
</template>

<script setup>
const user = useCookie('username')
const token = useCookie('access_token')
const config = useRuntimeConfig()
const user_id = useCookie('user_id')
const supabase = useSupabaseClient()
const route = useRoute()
const lobby_id = route.params.id

const players = ref([])
const submitError = ref({error: false, msg: ""})
const mappool = ref([])
const submitting = ref(false)
const lobby_status = ref({
    started: false,
    ended: false,
    team_won: ""
})

if (!user.value) {
    navigateTo('/')
}

const { data: fetchLobby } = await supabase.from('lobbies').select('players, mappool, started, ended').eq('lobby_id', lobby_id)
players.value = fetchLobby[0].players
lobby_status.value.started = fetchLobby[0].started
lobby_status.value.ended = fetchLobby[0].ended
mappool.value = fetchLobby[0].mappool

supabase.channel('public:lobbies').on('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'lobbies', filter: `lobby_id=eq.${lobby_id}`}, payload => {
    mappool.value = payload.new.mappool
    players.value = payload.new.players
    lobby_status.value.started = payload.new.started
    if (checkForWin(mappool.value)) {
        endLobby()
    }
}).subscribe()


function leaveLobby() {
    navigateTo('/')
}

async function endLobby() {
    await supabase.from('lobbies').update({ ended: true}).eq('lobby_id', lobby_id)
}

async function startLobby() {
    await supabase.from('lobbies').update({ started: true}).eq('lobby_id', lobby_id)
}

async function changeTeam(player_index, team) {
    players.value[player_index].team = team
    document.activeElement.blur()

    await supabase.from('lobbies').update({ players: players.value}).eq('lobby_id', lobby_id)
}

async function submitPlay() {
    submitting.value = true
    submitError.value = {error: false}

    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        Authorization: `Bearer ${token.value}`
    }

    const { data: fetchPlay, error } = await useFetch(`${config.APP_PATH}/api/recent/${user_id.value}`, {headers: headers})
    if (!fetchPlay.value[0]) {
        submitting.value = false
        submitError.value = {
            error: true,
            msg: `No recently submitted maps on your profile`
        }
        return
    }
    const beatmap_id = fetchPlay.value[0].beatmap.id
    const score = fetchPlay.value[0].score
    const beatmap_name = `${fetchPlay.value[0].beatmapset.artist} - ${fetchPlay.value[0].beatmapset.title} [${fetchPlay.value[0].beatmap.version}]`

    let contains = false
    mappool.value.forEach((map) => {
        if (map.map_id == beatmap_id) {
            contains = true
            return
        }
    })

    if (!contains) {
        submitting.value = false
        submitError.value = {
            error: true,
            msg: `${beatmap_name} is not in the mappool`
        }
        return
    }

    const { data: fetchMappool } = await supabase.from('lobbies').select('mappool').eq('lobby_id', lobby_id)
    const matched_map = fetchMappool[0].mappool.find((map) => map.map_id == beatmap_id)
    const matched_map_index = fetchMappool[0].mappool.indexOf(matched_map)
    if (matched_map.score <= score) {
        const matched_player = players.value.find((player) => player.player == user.value)
        let newMappool = fetchMappool[0].mappool
        newMappool[matched_map_index] = {...newMappool[matched_map_index], 'player': user.value, 'score': score, 'team': matched_player.team}

        const { data, error } = await supabase.from('lobbies').update({ mappool: newMappool}).eq('lobby_id', lobby_id)
        submitting.value = false
        return
    }
    else {
        submitting.value = false
        submitError.value = {
            error: true,
            msg: "Submitted score is lower than current score"
        }
        return
    }
}

function checkForWin(mappool_arr) {
    const allEqual = arr => arr.every(v => v === arr[0] && v != "")

    // check rows
    for (let row_index = 0; row_index < mappool_arr.length; row_index += 5) {
        let row = []
        for (let item_index = row_index; item_index < row_index + 5; item_index++) {
            row.push(mappool_arr[item_index].team)
        }
        if (allEqual(row)) {
            lobby_status.value.ended = true
            lobby_status.value.team_won = row[0]
            return true
        }
    }

    // check columns
    for (let col_index = 0; col_index < mappool_arr.length / 5; col_index++) {
        let col = []
        for (let item_index = col_index; item_index < mappool_arr.length; item_index += 5) {
            col.push(mappool_arr[item_index].team)
        }
        if (allEqual(col)) {
            lobby_status.value.ended = true
            lobby_status.value.team_won = col[0]
            return true
        }
    }

    return false
}

onBeforeRouteLeave(async () => {
    const newPlayers = players.value.filter((player => player.player != user.value))
    if (newPlayers.length == 0) {
        await supabase.from('lobbies').delete().eq('lobby_id', lobby_id)
    } else {
        await supabase.from('lobbies').update({ players: newPlayers}).eq('lobby_id', lobby_id)
    }
    await supabase.removeAllChannels()
})

</script>