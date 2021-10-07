class Session
{
    constructor()
    {
        this.sessions=new Map();
    }

    saveSession(sessionID,userID,username,avatar,isConnected)
    {
        this.sessions.set(sessionID,{userID,username,avatar,isConnected});
    }

    findSession(sessionID)
    {
        return this.sessions.get(sessionID);
    }

    getUserById(id)
    {
        var result
        this.sessions.forEach(function(value,key,map)
        {
            if(value.userID==id)
            {
                result=value;
            }
        })
        return result;
    }

    getUserByName(name)
    {
        return this.sessions.get(name);
    }
    /*
    removeSession(id)
    {
        const index=listUsers.findIndex((user)=>user.id===id);
        if(index===-1)
        {
            return{error:"Can't remove user : not found"};
        }
        else
        {
            listUsers.splice(index,1);
        }
    }
    */

    findAllSession()
    {
        return [...this.sessions.values()];
    }
}



module.exports={Session};
