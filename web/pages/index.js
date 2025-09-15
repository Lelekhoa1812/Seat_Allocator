export default function Home(){
	if (typeof window !== 'undefined'){
		window.location.replace('/landing.html');
		return null;
	}
	return null;
}
