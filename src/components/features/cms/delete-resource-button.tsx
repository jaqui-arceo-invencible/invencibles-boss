"use client";
export function DeleteResourceButton({title}:{title:string}){
 return <button type="submit" onClick={event=>{if(!window.confirm(`¿Eliminar definitivamente «${title}»? Esta acción no se puede deshacer.`))event.preventDefault();}}>Eliminar archivo</button>;
}
