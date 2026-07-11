import api from "./api";

export async function sendMessage(message){

    const response = await api.post("/chat",{
        message
    });
    console.log("message sent to backend", message);

    console.log("response from backend", response.data);
    return response.data;
}