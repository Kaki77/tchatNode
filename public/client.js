const username="{{post.username}}";
var socket = io();
socket.emit('join',username);
var form = document.getElementById('form');
var input = document.getElementById('input');
var menu = document.getElementById('buttonMenu');
var lastUsername="";
input.addEventListener('input',function(e)
{
    socket.emit('isTyping',username);
})
form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (input.value)
    {
        socket.emit('chat message',username,input.value);
        if(lastUsername!=username)
        {
            var item = document.createElement('li');
            item.classList.add('text-end');
            item.style.marginLeft='auto';
            item.style.marginRight='0';
            item.innerHTML ="<p style='font-style:italic;text-decoration:underline'>"+username+" :</p>"+input.value;
            messages.appendChild(item);
            lastUsername=username; 
        }
        else
        {
            var item = document.getElementById('messages').lastChild.innerHTML+="<br/>"+input.value; 
        }
        window.scrollTo(0, document.body.scrollHeight);
        input.value = '';
    }
});
menu.onclick=function()
{
   socket.emit('get list',socket.id);
};
socket.on('chat message', function(username,msg) {
    document.getElementById('typing').innerHTML='';
    if(lastUsername!=username)
    {
        var item = document.createElement('li');
        item.innerHTML ="<p style='font-style:italic;text-decoration:underline'>"+username+" :</p>"+msg;
        messages.appendChild(item);
        lastUsername=username;
    }
    else
    {
        document.getElementById('messages').lastChild.innerHTML+="<br/>"+msg;
    }
    
    window.scrollTo(0, document.body.scrollHeight);
});
socket.on('connexion message', function(msg) {
    var item = document.createElement('li');
    item.textContent = msg;
    item.style.fontStyle="italic";
    messages.appendChild(item);
    lastUsername="";
    window.scrollTo(0, document.body.scrollHeight);
});
socket.on('isTyping', function(username) {
   document.getElementById('typing').innerHTML="<h6 style='font-style:italic'>"+username+" est en train d'écrire...</h6>";
});
socket.on('get list',function(list)
{
   for(i=0;i<list.length;i++)
   {
      if(!document.getElementsByClassName(list[i].username)[0])
      {
         var item=document.createElement('li');
         item.classList.add(list[i].username);
         item.innerHTML="<div class='container'><div class='row'><div class='col-5 text-center'><img class='rounded-circle' src='/public/avatar.jpg' width='100' height='100'><p>"+list[i].username+"</p></div><div class='col-7 text-center'><p>Mon message</p></div></div></div>";
         listUser.appendChild(item);
      }  
   }
});