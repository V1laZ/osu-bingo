<template>
    <div class="login-page">
        <div class="login-wrapper">
            <p class="welcome-text">Welcome to osu!bingo</p>
            <button @click="getCodeGrant" class="login-btn" type="button">Login</button>
        </div>
    </div>
</template>

<script setup>
const runtimeConfig = useRuntimeConfig()

function getCodeGrant() {
    const params = {
        client_id: runtimeConfig.CLIENT_ID,
        redirect_uri: `${runtimeConfig.APP_PATH}/auth`,
        response_type: 'code',
        scope: 'identify public'
    }

    const qs = new URLSearchParams(params).toString()
    const redirect_url = `https://osu.ppy.sh/oauth/authorize?${qs}`

    navigateTo(redirect_url, {external: true})

}
</script>