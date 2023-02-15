<template>
    <div class="error-page">
        <p class="error-page-text">Something went wrong</p>
        <button @click="handleError" class="error-page-btn">Go Back</button>
    </div>
</template>

<script setup>
const props = defineProps({
    error: Object
})

const handleError = () => clearError({ redirect: '/' })

</script>