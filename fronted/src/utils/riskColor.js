export function getRiskColor(risk){

    switch(risk){

        case "SAFE":
            return "green";

        case "LOW":
            return "gold";

        case "MODERATE":
            return "orange";

        case "HIGH":
            return "red";

        default:
            return "gray";

    }

}