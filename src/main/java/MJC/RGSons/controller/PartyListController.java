package MJC.RGSons.controller;

import MJC.RGSons.model.Party;
import MJC.RGSons.service.SalesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PartyListController {

    @Autowired
    private SalesService salesService;

    @GetMapping("/PartyList")
    public ResponseEntity<Map<String, Object>> getPartyList() {
        Map<String, Object> response = new HashMap<>();
        List<Party> parties = salesService.getAllParties();

        List<Map<String, Object>> formattedParties = parties.stream().map(p -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("code", p.getCode());
            map.put("name", p.getName());
            map.put("address", p.getAddress());
            map.put("city", p.getCity());
            map.put("state", p.getState());
            map.put("district", p.getDistrict());
            map.put("pin", p.getPin());
            map.put("phone", p.getPhone());
            map.put("email", p.getEmail());
            map.put("pan", p.getPan());
            map.put("gstNumber", p.getGstNumber());
            map.put("vatNo", p.getVatNo());
            map.put("type", p.getType());
            map.put("status", p.getStatus());
            return map;
        }).collect(Collectors.toList());

        response.put("PartyList", formattedParties);
        return ResponseEntity.ok(response);
    }
}
