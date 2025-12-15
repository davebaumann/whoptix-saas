export const setCookie = (name: string, value: string, days: number = 30) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
}

export const getCookie = (name: string): string | null => {
  return document.cookie.split('; ').find(row => row.startsWith(name + '='))?.split('=')[1] 
    ? decodeURIComponent(document.cookie.split('; ').find(row => row.startsWith(name + '='))!.split('=')[1])
    : null
}