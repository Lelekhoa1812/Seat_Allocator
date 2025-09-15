export default function Students(){
	if (typeof window !== 'undefined'){
		window.location.replace('/student.html');
		return null;
	}
	return null;
}
