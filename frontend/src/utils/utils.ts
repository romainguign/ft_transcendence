export function getCookie(name: string) : string | null {

	console.log('cookielo:', document.cookie);

    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

export async function getCurrentUser() {
    try {
      const response = await fetch('/api/user/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error('Erreur lors de la récupération des informations utilisateur');
      }
      
      const userData = await response.json();
      return userData;
    } catch (error) {
      console.error('Erreur:', error);
      return null;
    }
  }
  