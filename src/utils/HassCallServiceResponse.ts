import { HomeAssistant, stateIcon } from "custom-card-helpers";

export class HassCallServiceResponse {

    public callServicWithResponse(hass: HomeAssistant, domain: string, service: string, entity_id: string, service_data?) {
        var message;
        if (service_data === undefined) {
            message = {
                type: "call_service",
                domain: domain,
                service: service,
                target: {
                    entity_id: entity_id,
                },
                id: 1,
                return_response: true,
            };
        } else {
            message = {
                type: "call_service",
                domain: domain,
                service: service,
                target: {
                    entity_id: entity_id,
                },
                id: 1,
                return_response: true,
                data: service_data
            };
        }

        return hass.callWS(message);
    }

}
