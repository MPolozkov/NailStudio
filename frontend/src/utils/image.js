// Утилиты для работы с изображениями в личных кабинетах.
// 1) Проверка, что выбранный файл действительно является изображением.
// 2) Конвертация изображения в формат WebP (все изображения хранятся в WebP).

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif', 'image/svg+xml']

export function isImageFile(file) {
  if (!file) return false
  // Сначала проверяем MIME-тип файла
  if (file.type && file.type.startsWith('image/')) return true
  // Если MIME-тип пустой — пробуем определить по расширению
  if (file.name) {
    const ext = file.name.split('.').pop().toLowerCase()
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'svg'].includes(ext)) return true
  }
  return false
}

// Читает файл, проверяет что это изображение и возвращает его в формате WebP (data URL).
// Если файл не является изображением — бросает ошибку с понятным сообщением.
export function readImageAsWebP(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Файл не выбран'))
      return
    }
    if (!isImageFile(file)) {
      reject(new Error('Вы пытаетесь загрузить не изображение. Пожалуйста, выберите файл изображения (JPG, PNG, WebP).'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          // Конвертируем в WebP. Если браузер не поддерживает WebP — сохраняем как есть.
          const webpDataUrl = canvas.toDataURL('image/webp', 0.9)
          if (webpDataUrl.startsWith('data:image/webp')) {
            resolve(webpDataUrl)
          } else {
            resolve(reader.result)
          }
        } catch (err) {
          reject(new Error('Не удалось преобразовать изображение в формат WebP'))
        }
      }
      img.onerror = () => reject(new Error('Не удалось прочитать изображение. Файл повреждён или не является изображением.'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsDataURL(file)
  })
}