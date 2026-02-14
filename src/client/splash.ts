import { requestExpandedMode } from '@devvit/web/client'

document.addEventListener('DOMContentLoaded', () => {
  const playButton = document.getElementById('play-button')
  if (!playButton) return

  playButton.addEventListener('click', async (event: MouseEvent) => {
    playButton.textContent = 'Loading...'
    ;(playButton as HTMLButtonElement).disabled = true

    try {
      requestExpandedMode(event, 'game')
    } catch (err) {
      console.error('Failed to enter expanded mode:', err)
      playButton.textContent = 'Play'
      ;(playButton as HTMLButtonElement).disabled = false
    }
  })
})
