package MJC.RGSons.controller;

import MJC.RGSons.dto.MerchandiseHierarchyDetailsDTO;
import MJC.RGSons.dto.MerchandiseHierarchyTreeNodeDTO;
import MJC.RGSons.dto.MerchandiseItemMappingRequest;
import MJC.RGSons.dto.MerchandiseMappedItemDTO;
import MJC.RGSons.model.MerchandiseHierarchy;
import MJC.RGSons.service.MerchandiseHierarchyService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/merchandise-hierarchy")
@CrossOrigin(origins = "*")
public class MerchandiseHierarchyController {
    // Debugging note: touching this file forces Maven to recompile controller instrumentation.

    @Autowired
    private MerchandiseHierarchyService merchandiseHierarchyService;

    @GetMapping("/tree")
    public ResponseEntity<Map<String, Object>> getTree() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<MerchandiseHierarchyTreeNodeDTO> tree = merchandiseHierarchyService.getTree();
            response.put("success", true);
            response.put("message", "Merchandise hierarchy retrieved successfully");
            response.put("tree", tree);
            response.put("count", tree.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving merchandise hierarchy: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getNodeDetails(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            MerchandiseHierarchyDetailsDTO details = merchandiseHierarchyService.getNodeDetails(id);
            response.put("success", true);
            response.put("message", "Node details retrieved successfully");
            response.put("node", details);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving node details: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createNode(@RequestBody MerchandiseHierarchy request,
                                                          @RequestHeader(value = "X-User-Name", required = false) String userName) {
        Map<String, Object> response = new HashMap<>();
        try {
            // #region debug-point A:create-node-controller-entry
            try {
                String env = "";
                try { env = Files.readString(Path.of(".dbg/merch-write-actions.env")); } catch (Exception ignored) {}
                String url = env.lines().filter(l -> l.startsWith("DEBUG_SERVER_URL=")).map(l -> l.substring("DEBUG_SERVER_URL=".length()).trim()).findFirst().orElse("http://127.0.0.1:7777/event");
                String sessionId = env.lines().filter(l -> l.startsWith("DEBUG_SESSION_ID=")).map(l -> l.substring("DEBUG_SESSION_ID=".length()).trim()).findFirst().orElse("merch-write-actions");
                String nodeName = request != null && request.getNodeName() != null ? request.getNodeName().replace("\"", "'").replace("\n", " ").replace("\r", " ") : "";
                String nodeCode = request != null && request.getNodeCode() != null ? request.getNodeCode().replace("\"", "'").replace("\n", " ").replace("\r", " ") : "";
                String body = "{\"sessionId\":\"" + sessionId + "\",\"runId\":\"pre\",\"hypothesisId\":\"A\",\"location\":\"MerchandiseHierarchyController:createNode\",\"msg\":\"[DEBUG] createNode request received\",\"data\":{\"userName\":\"" + String.valueOf(userName).replace("\"", "'") + "\",\"parentId\":\"" + (request != null ? request.getParentId() : null) + "\",\"nodeName\":\"" + nodeName + "\",\"nodeCode\":\"" + nodeCode + "\",\"sortOrder\":\"" + (request != null ? request.getSortOrder() : null) + "\"},\"ts\":" + System.currentTimeMillis() + "}";
                HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create(url)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.discarding());
            } catch (Exception ignored) {}
            // #endregion

            MerchandiseHierarchy saved = merchandiseHierarchyService.createNode(request, userName);
            response.put("success", true);
            response.put("message", "Node created successfully");
            response.put("node", saved);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            // #region debug-point B:create-node-controller-error
            try {
                String env = "";
                try { env = Files.readString(Path.of(".dbg/merch-write-actions.env")); } catch (Exception ignored) {}
                String url = env.lines().filter(l -> l.startsWith("DEBUG_SERVER_URL=")).map(l -> l.substring("DEBUG_SERVER_URL=".length()).trim()).findFirst().orElse("http://127.0.0.1:7777/event");
                String sessionId = env.lines().filter(l -> l.startsWith("DEBUG_SESSION_ID=")).map(l -> l.substring("DEBUG_SESSION_ID=".length()).trim()).findFirst().orElse("merch-write-actions");
                String err = e.getMessage() != null ? e.getMessage().replace("\"", "'").replace("\n", " ").replace("\r", " ") : "";
                String body = "{\"sessionId\":\"" + sessionId + "\",\"runId\":\"pre\",\"hypothesisId\":\"B\",\"location\":\"MerchandiseHierarchyController:createNode\",\"msg\":\"[DEBUG] createNode failed\",\"data\":{\"error\":\"" + err + "\"},\"ts\":" + System.currentTimeMillis() + "}";
                HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create(url)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.discarding());
            } catch (Exception ignored) {}
            // #endregion

            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateNode(@PathVariable Integer id,
                                                          @RequestBody MerchandiseHierarchy request,
                                                          @RequestHeader(value = "X-User-Name", required = false) String userName) {
        Map<String, Object> response = new HashMap<>();
        try {
            MerchandiseHierarchy saved = merchandiseHierarchyService.updateNode(id, request, userName);
            response.put("success", true);
            response.put("message", "Node updated successfully");
            response.put("node", saved);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteNode(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            merchandiseHierarchyService.deleteNode(id);
            response.put("success", true);
            response.put("message", "Node deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping("/{nodeId}/items")
    public ResponseEntity<Map<String, Object>> getMappedItems(@PathVariable Integer nodeId) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<MerchandiseMappedItemDTO> items = merchandiseHierarchyService.getMappedItems(nodeId);
            response.put("success", true);
            response.put("message", "Mapped items retrieved successfully");
            response.put("items", items);
            response.put("count", items.size());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @PostMapping("/{nodeId}/items")
    public ResponseEntity<Map<String, Object>> addMappedItems(@PathVariable Integer nodeId,
                                                              @RequestBody MerchandiseItemMappingRequest request,
                                                              @RequestHeader(value = "X-User-Name", required = false) String userName) {
        Map<String, Object> response = new HashMap<>();
        try {
            int inserted = merchandiseHierarchyService.addItemMappings(nodeId, request.getItemCodes(), userName);
            response.put("success", true);
            response.put("message", inserted > 0 ? "Items mapped successfully" : "Selected items are already mapped to this node");
            response.put("insertedCount", inserted);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @DeleteMapping("/items/{mappingId}")
    public ResponseEntity<Map<String, Object>> removeMappedItem(@PathVariable Integer mappingId) {
        Map<String, Object> response = new HashMap<>();
        try {
            merchandiseHierarchyService.removeItemMapping(mappingId);
            response.put("success", true);
            response.put("message", "Mapped item removed successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
}
