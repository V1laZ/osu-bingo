<template>
    <div class="auth-page">
        <p class="auth-redirect-text">Redirecting ...</p>
    </div>
</template>

<script setup>
const config = useRuntimeConfig()
const route = useRoute()

const code = route.query.code
const profile_img = ref("")

const req_headers = {
    "Accept": "application/json",
    "Content-Type": "application/json"
}

const { data: res_token } = await useFetch(`${config.APP_PATH}/api/auth`, {
    method: 'POST',
    headers: req_headers,
    body: JSON.stringify({
        "client_id": config.CLIENT_ID,
        "client_secret": config.CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": `${config.APP_PATH}/auth`
    }),
})

if (res_token.value) {
    const token_cookie = useCookie('access_token', {maxAge: res_token.value.expires_in, sameSite: 'strict'})
    token_cookie.value = res_token.value.access_token

    const headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${res_token.value.access_token}`
    }

    const { data: fetchUser } = await useFetch(`${config.APP_PATH}/api/me`, {headers: headers})

    const user_cookie = useCookie('username', {maxAge: res_token.value.expires_in, sameSite: 'strict'})
    user_cookie.value = fetchUser.value.username

    profile_img.value = fetchUser.value.avatar_url

    const userId_cookie = useCookie('user_id', {maxAge: res_token.value.expires_in, sameSite: 'strict'})
    userId_cookie.value = fetchUser.value.id
}

onMounted(() => {
    if (res_token.value) {
        window.localStorage.setItem('profile-img', profile_img.value)
        return navigateTo('/')
    }
})

</script>