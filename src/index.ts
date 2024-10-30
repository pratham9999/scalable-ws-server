import {WebSocketServer , WebSocket} from 'ws';
import { createClient } from 'redis';

const publishClient = createClient();
publishClient.connect();

const subscribeClient = createClient();
subscribeClient.connect();


const wss = new WebSocketServer({port : 8081})

const subscription : {[key : string] : {
    ws : WebSocket,
    rooms : string[]
}} = {

}

// setInterval(()=>{
//     console.log(subscription);
    
// } , 5000)

wss.on('connection' , function connection(userSocket){

    const id = randomId();
    subscription[id]={
        ws:userSocket,
        rooms:[]
    }

    
    
  
    userSocket.on('message' , function message(data){
        const parsedMessage=JSON.parse(data as unknown as string);
        if(parsedMessage.type==="SUBSCRIBE"){
            subscription[id].rooms.push(parsedMessage.room);
            if(oneUserSubscribedTo(parsedMessage.room)){
                console.log('subscribing to pubsub to room' + parsedMessage.room);
                
                subscribeClient.subscribe(parsedMessage.room,(message)=>{
                    const parsedMessage=JSON.parse(message);
                      Object.keys(subscription).forEach((userId)=>{
                        const {ws , rooms} = subscription[userId];
                        if(rooms.includes(parsedMessage.roomId)){
                                ws.send(parsedMessage.message);   
                        }
                      })
                })
            }
            
        }


        if(parsedMessage.type==="UNSUBSCRIBE"){
            subscription[id].rooms=subscription[id].rooms.filter(x=>x!==parsedMessage.room);

            if(lastPersonLeftRoom(parsedMessage.room)){
                console.log("unsubscribing on room" + parsedMessage.room);
                
                subscribeClient.unsubscribe(parsedMessage.room)
            }
        }

        if(parsedMessage.type==="sendMessage"){
             const message = parsedMessage.message;
             const roomId= parsedMessage.roomId;

            //  Object.keys(subscription).forEach((userId)=>{
            //      const {ws , rooms} =  subscription[userId];

            //      if(rooms.includes(roomId)){
                    
            //            ws.send(message);
            //      }
            //  })

            
            publishClient.publish(roomId , JSON.stringify({
                 type:"sendMessage",
                 roomId : roomId,
                 message
            }))


        }
        
        
    });
    

   
})


function randomId(){
    return Math.random();
}

function oneUserSubscribedTo(roomId : string){

    let totalIntrestedPeople=0;
    Object.keys(subscription).map(userId => {
        if(subscription[userId].rooms.includes(roomId)){
            totalIntrestedPeople++;
        }
    })

    if(totalIntrestedPeople==1){
        return true;
    }

    return false;

}


function lastPersonLeftRoom(roomId : string){
          let totalIntrestedPeople=0;
          Object.keys(subscription).map(userId => {
            if(subscription[userId].rooms.includes(roomId)){
                totalIntrestedPeople++;
            }
          })

          if(totalIntrestedPeople==0){
             return true;
          }

          return false;
}
