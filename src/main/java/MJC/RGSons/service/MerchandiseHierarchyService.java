package MJC.RGSons.service;

import MJC.RGSons.dto.MerchandiseHierarchyDetailsDTO;
import MJC.RGSons.dto.MerchandiseHierarchyTreeNodeDTO;
import MJC.RGSons.dto.MerchandiseMappedItemDTO;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.MerchandiseHierarchy;
import MJC.RGSons.model.MerchandiseItemMapping;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.MerchandiseHierarchyRepository;
import MJC.RGSons.repository.MerchandiseItemMappingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class MerchandiseHierarchyService {
    // Debugging note: touching this file forces Maven to recompile service instrumentation.

    @Autowired
    private MerchandiseHierarchyRepository merchandiseHierarchyRepository;

    @Autowired
    private MerchandiseItemMappingRepository merchandiseItemMappingRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private SequenceGeneratorService sequenceGeneratorService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public List<MerchandiseHierarchyTreeNodeDTO> getTree() {
        List<MerchandiseHierarchy> nodes = merchandiseHierarchyRepository.findAllByOrderByNodeLevelAscSortOrderAscNodeNameAsc();
        Map<Integer, Integer> itemCounts = new LinkedHashMap<>();
        for (Object[] row : merchandiseItemMappingRepository.countMappedItemsByNode()) {
            Integer nodeId = row[0] instanceof Integer ? (Integer) row[0] : null;
            Integer count = row[1] instanceof Number ? ((Number) row[1]).intValue() : 0;
            if (nodeId != null) {
                itemCounts.put(nodeId, count);
            }
        }

        Map<Integer, MerchandiseHierarchyTreeNodeDTO> dtoById = new LinkedHashMap<>();
        for (MerchandiseHierarchy node : nodes) {
            MerchandiseHierarchyTreeNodeDTO dto = new MerchandiseHierarchyTreeNodeDTO();
            dto.setId(node.getId());
            dto.setParentId(node.getParentId());
            dto.setNodeCode(node.getNodeCode());
            dto.setNodeName(node.getNodeName());
            dto.setNodeLevel(node.getNodeLevel());
            dto.setHierarchyPath(node.getHierarchyPath());
            dto.setSortOrder(node.getSortOrder());
            dto.setStatus(node.getStatus());
            dto.setItemCount(itemCounts.getOrDefault(node.getId(), 0));
            dtoById.put(node.getId(), dto);
        }

        List<MerchandiseHierarchyTreeNodeDTO> roots = new ArrayList<>();
        for (MerchandiseHierarchy node : nodes) {
            MerchandiseHierarchyTreeNodeDTO dto = dtoById.get(node.getId());
            if (node.getParentId() == null) {
                roots.add(dto);
                continue;
            }
            MerchandiseHierarchyTreeNodeDTO parent = dtoById.get(node.getParentId());
            if (parent == null) {
                roots.add(dto);
                continue;
            }
            parent.getChildren().add(dto);
        }

        sortAndCount(roots);
        return roots;
    }

    public MerchandiseHierarchyDetailsDTO getNodeDetails(Integer id) {
        MerchandiseHierarchy node = getNodeOrThrow(id);
        MerchandiseHierarchyDetailsDTO dto = new MerchandiseHierarchyDetailsDTO();
        dto.setId(node.getId());
        dto.setParentId(node.getParentId());
        dto.setNodeCode(node.getNodeCode());
        dto.setNodeName(node.getNodeName());
        dto.setNodeLevel(node.getNodeLevel());
        dto.setHierarchyPath(node.getHierarchyPath());
        dto.setSortOrder(node.getSortOrder());
        dto.setStatus(node.getStatus());
        dto.setCreatedBy(node.getCreatedBy());
        dto.setCreatedAt(node.getCreatedAt());
        dto.setUpdateBy(node.getUpdateBy());
        dto.setUpdateAt(node.getUpdateAt());
        dto.setChildCount((int) merchandiseHierarchyRepository.countByParentId(node.getId()));
        dto.setItemCount((int) merchandiseItemMappingRepository.countByNodeId(node.getId()));
        if (node.getParentId() != null) {
            merchandiseHierarchyRepository.findById(node.getParentId()).ifPresent(parent -> dto.setParentName(parent.getNodeName()));
        }
        return dto;
    }

    public List<MerchandiseMappedItemDTO> getMappedItems(Integer nodeId) {
        getNodeOrThrow(nodeId);

        String sql = """
                SELECT
                    mim.id AS mapping_id,
                    i.item_code,
                    i.item_name,
                    COALESCE(b.name, '') AS brand_name,
                    COALESCE(i.size, '') AS size_name,
                    COALESCE(c.name, '') AS category_name
                FROM merchandise_item_mapping mim
                JOIN items i ON LTRIM(RTRIM(mim.item_code)) = LTRIM(RTRIM(i.item_code))
                LEFT JOIN brand b ON LTRIM(RTRIM(i.brand_code)) = LTRIM(RTRIM(b.code))
                LEFT JOIN category c ON LTRIM(RTRIM(i.category_code)) = LTRIM(RTRIM(c.code))
                WHERE mim.node_id = ?
                ORDER BY i.item_name, i.item_code
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            MerchandiseMappedItemDTO dto = new MerchandiseMappedItemDTO();
            dto.setMappingId(rs.getInt("mapping_id"));
            dto.setItemCode(rs.getString("item_code"));
            dto.setItemName(rs.getString("item_name"));
            dto.setBrandName(rs.getString("brand_name"));
            dto.setSize(rs.getString("size_name"));
            dto.setCategoryName(rs.getString("category_name"));
            return dto;
        }, nodeId);
    }

    @Transactional
    public MerchandiseHierarchy createNode(MerchandiseHierarchy input, String userName) {
        try {
            String nodeName = normalizeRequired(input.getNodeName(), "Node name is required");
            Integer parentId = input.getParentId();
            MerchandiseHierarchy parent = null;
            if (parentId != null) {
                parent = getNodeOrThrow(parentId);
            }

            // #region debug-point C:create-node-service-entry
            try {
                String env = "";
                try { env = Files.readString(Path.of(".dbg/merch-write-actions.env")); } catch (Exception ignored) {}
                String url = env.lines().filter(l -> l.startsWith("DEBUG_SERVER_URL=")).map(l -> l.substring("DEBUG_SERVER_URL=".length()).trim()).findFirst().orElse("http://127.0.0.1:7777/event");
                String sessionId = env.lines().filter(l -> l.startsWith("DEBUG_SESSION_ID=")).map(l -> l.substring("DEBUG_SESSION_ID=".length()).trim()).findFirst().orElse("merch-write-actions");
                String dbName = "";
                try { dbName = String.valueOf(jdbcTemplate.queryForObject("SELECT DB_NAME()", String.class)); } catch (Exception ignored) {}
                String safeName = nodeName.replace("\"", "'").replace("\n", " ").replace("\r", " ");
                String body = "{\"sessionId\":\"" + sessionId + "\",\"runId\":\"pre\",\"hypothesisId\":\"C\",\"location\":\"MerchandiseHierarchyService:createNode\",\"msg\":\"[DEBUG] createNode service entry\",\"data\":{\"db\":\"" + dbName + "\",\"userName\":\"" + resolveUserName(userName) + "\",\"parentId\":\"" + parentId + "\",\"nodeName\":\"" + safeName + "\"},\"ts\":" + System.currentTimeMillis() + "}";
                HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create(url)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.discarding());
            } catch (Exception ignored) {}
            // #endregion

            if (merchandiseHierarchyRepository.countSiblingName(parentId, nodeName) > 0) {
                throw new RuntimeException("Duplicate node name not allowed under the same parent");
            }

            String nodeCode = normalizeOptional(input.getNodeCode());
            if (nodeCode == null) {
                nodeCode = sequenceGeneratorService.generateSequence("Master_SEQ");
            } else if (merchandiseHierarchyRepository.existsByNodeCode(nodeCode)) {
                throw new RuntimeException("Node code already exists: " + nodeCode);
            }

            MerchandiseHierarchy entity = new MerchandiseHierarchy();
            entity.setParentId(parentId);
            entity.setNodeCode(nodeCode);
            entity.setNodeName(nodeName);
            entity.setNodeLevel(parent == null ? 1 : safeInt(parent.getNodeLevel(), 0) + 1);
            entity.setHierarchyPath("");
            entity.setSortOrder(input.getSortOrder() == null ? 0 : input.getSortOrder());
            entity.setStatus(input.getStatus() == null ? true : input.getStatus());
            entity.setCreatedBy(resolveUserName(userName));
            entity.setCreatedAt(LocalDateTime.now());
            entity.setUpdateBy(resolveUserName(userName));
            entity.setUpdateAt(LocalDateTime.now());

            MerchandiseHierarchy saved = merchandiseHierarchyRepository.saveAndFlush(entity);

            // #region debug-point D:create-node-service-after-first-save
            try {
                String env = "";
                try { env = Files.readString(Path.of(".dbg/merch-write-actions.env")); } catch (Exception ignored) {}
                String url = env.lines().filter(l -> l.startsWith("DEBUG_SERVER_URL=")).map(l -> l.substring("DEBUG_SERVER_URL=".length()).trim()).findFirst().orElse("http://127.0.0.1:7777/event");
                String sessionId = env.lines().filter(l -> l.startsWith("DEBUG_SESSION_ID=")).map(l -> l.substring("DEBUG_SESSION_ID=".length()).trim()).findFirst().orElse("merch-write-actions");
                String body = "{\"sessionId\":\"" + sessionId + "\",\"runId\":\"pre\",\"hypothesisId\":\"D\",\"location\":\"MerchandiseHierarchyService:createNode\",\"msg\":\"[DEBUG] first save returned id\",\"data\":{\"savedId\":\"" + (saved != null ? saved.getId() : null) + "\",\"nodeCode\":\"" + String.valueOf(nodeCode) + "\"},\"ts\":" + System.currentTimeMillis() + "}";
                HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create(url)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.discarding());
            } catch (Exception ignored) {}
            // #endregion

            saved.setHierarchyPath(parent == null ? String.valueOf(saved.getId()) : parent.getHierarchyPath() + "/" + saved.getId());
            saved.setUpdateAt(LocalDateTime.now());
            saved.setUpdateBy(resolveUserName(userName));
            MerchandiseHierarchy saved2 = merchandiseHierarchyRepository.saveAndFlush(saved);

            // #region debug-point E:create-node-service-after-second-save
            try {
                String env = "";
                try { env = Files.readString(Path.of(".dbg/merch-write-actions.env")); } catch (Exception ignored) {}
                String url = env.lines().filter(l -> l.startsWith("DEBUG_SERVER_URL=")).map(l -> l.substring("DEBUG_SERVER_URL=".length()).trim()).findFirst().orElse("http://127.0.0.1:7777/event");
                String sessionId = env.lines().filter(l -> l.startsWith("DEBUG_SESSION_ID=")).map(l -> l.substring("DEBUG_SESSION_ID=".length()).trim()).findFirst().orElse("merch-write-actions");
                String pathValue = saved2 != null && saved2.getHierarchyPath() != null ? saved2.getHierarchyPath().replace("\"", "'") : "";
                String body = "{\"sessionId\":\"" + sessionId + "\",\"runId\":\"pre\",\"hypothesisId\":\"E\",\"location\":\"MerchandiseHierarchyService:createNode\",\"msg\":\"[DEBUG] second save completed\",\"data\":{\"savedId\":\"" + (saved2 != null ? saved2.getId() : null) + "\",\"hierarchyPath\":\"" + pathValue + "\"},\"ts\":" + System.currentTimeMillis() + "}";
                HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create(url)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.discarding());
            } catch (Exception ignored) {}
            // #endregion

            return saved2;
        } catch (RuntimeException e) {
            // #region debug-point E:create-node-service-error
            try {
                String env = "";
                try { env = Files.readString(Path.of(".dbg/merch-write-actions.env")); } catch (Exception ignored) {}
                String url = env.lines().filter(l -> l.startsWith("DEBUG_SERVER_URL=")).map(l -> l.substring("DEBUG_SERVER_URL=".length()).trim()).findFirst().orElse("http://127.0.0.1:7777/event");
                String sessionId = env.lines().filter(l -> l.startsWith("DEBUG_SESSION_ID=")).map(l -> l.substring("DEBUG_SESSION_ID=".length()).trim()).findFirst().orElse("merch-write-actions");
                String err = e.getMessage() != null ? e.getMessage().replace("\"", "'").replace("\n", " ").replace("\r", " ") : "";
                String body = "{\"sessionId\":\"" + sessionId + "\",\"runId\":\"pre\",\"hypothesisId\":\"E\",\"location\":\"MerchandiseHierarchyService:createNode\",\"msg\":\"[DEBUG] createNode threw exception\",\"data\":{\"error\":\"" + err + "\"},\"ts\":" + System.currentTimeMillis() + "}";
                HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create(url)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.discarding());
            } catch (Exception ignored) {}
            // #endregion
            throw e;
        }
    }

    @Transactional
    public MerchandiseHierarchy updateNode(Integer id, MerchandiseHierarchy input, String userName) {
        MerchandiseHierarchy existing = getNodeOrThrow(id);
        String nodeName = normalizeRequired(input.getNodeName(), "Node name is required");
        String nodeCode = normalizeOptional(input.getNodeCode());
        if (nodeCode == null) {
            throw new RuntimeException("Node code is required");
        }

        if (merchandiseHierarchyRepository.countSiblingNameExcludingId(existing.getParentId(), nodeName, id) > 0) {
            throw new RuntimeException("Duplicate node name not allowed under the same parent");
        }

        if (merchandiseHierarchyRepository.countNodeCodeExcludingId(nodeCode, id) > 0) {
            throw new RuntimeException("Node code already exists: " + nodeCode);
        }

        existing.setNodeName(nodeName);
        existing.setNodeCode(nodeCode);
        existing.setSortOrder(input.getSortOrder() == null ? 0 : input.getSortOrder());
        existing.setStatus(input.getStatus() == null ? existing.getStatus() : input.getStatus());
        existing.setUpdateBy(resolveUserName(userName));
        existing.setUpdateAt(LocalDateTime.now());
        return merchandiseHierarchyRepository.saveAndFlush(existing);
    }

    @Transactional
    public void deleteNode(Integer id) {
        MerchandiseHierarchy node = getNodeOrThrow(id);
        if (node.getParentId() == null) {
            throw new RuntimeException("Root node cannot be deleted");
        }
        if (merchandiseHierarchyRepository.countByParentId(id) > 0) {
            throw new RuntimeException("Cannot delete node because it has child nodes");
        }
        if (merchandiseItemMappingRepository.existsByNodeId(id)) {
            throw new RuntimeException("Cannot delete node because items are mapped to it");
        }
        merchandiseHierarchyRepository.delete(node);
    }

    @Transactional
    public int addItemMappings(Integer nodeId, List<String> itemCodes, String userName) {
        MerchandiseHierarchy targetNode = getNodeOrThrow(nodeId);
        Integer rootId = resolveRootNodeId(targetNode);
        String rootName = resolveRootNodeName(rootId);
        Set<String> normalizedCodes = new LinkedHashSet<>();
        if (itemCodes != null) {
            for (String itemCode : itemCodes) {
                String normalized = normalizeOptional(itemCode);
                if (normalized != null) {
                    normalizedCodes.add(normalized);
                }
            }
        }
        if (normalizedCodes.isEmpty()) {
            throw new RuntimeException("Please select at least one item");
        }

        List<String> alreadyMapped = new ArrayList<>();
        int inserted = 0;
        for (String itemCode : normalizedCodes) {
            Item item = itemRepository.findByItemCode(itemCode)
                    .orElseThrow(() -> new RuntimeException("Item not found: " + itemCode));

            Optional<MerchandiseItemMapping> existingMapping = merchandiseItemMappingRepository.findByRootIdAndItemCode(rootId, itemCode);
            if (existingMapping.isPresent()) {
                if (!existingMapping.get().getNodeId().equals(nodeId)) {
                    String mappedNodeName = merchandiseHierarchyRepository.findById(existingMapping.get().getNodeId())
                            .map(MerchandiseHierarchy::getNodeName)
                            .orElse("Unknown Node");
                    alreadyMapped.add(item.getItemName() + " (" + itemCode + ") -> " + mappedNodeName + " [Root: " + rootName + "]");
                }
                continue;
            }

            MerchandiseItemMapping mapping = new MerchandiseItemMapping();
            mapping.setNodeId(nodeId);
            mapping.setRootId(rootId);
            mapping.setItemCode(itemCode);
            mapping.setCreatedBy(resolveUserName(userName));
            mapping.setCreatedAt(LocalDateTime.now());
            merchandiseItemMappingRepository.save(mapping);
            inserted++;
        }

        if (!alreadyMapped.isEmpty()) {
            StringBuilder message = new StringBuilder("Selected item(s) already mapped under the same root:");
            int previewCount = Math.min(alreadyMapped.size(), 5);
            for (int i = 0; i < previewCount; i++) {
                message.append("\n- ").append(alreadyMapped.get(i));
            }
            if (alreadyMapped.size() > previewCount) {
                message.append("\n- and ").append(alreadyMapped.size() - previewCount).append(" more item(s)");
            }
            throw new RuntimeException(message.toString());
        }

        return inserted;
    }

    @Transactional
    public void removeItemMapping(Integer mappingId) {
        MerchandiseItemMapping mapping = merchandiseItemMappingRepository.findById(mappingId)
                .orElseThrow(() -> new RuntimeException("Item mapping not found with id: " + mappingId));
        merchandiseItemMappingRepository.delete(mapping);
    }

    private MerchandiseHierarchy getNodeOrThrow(Integer id) {
        return merchandiseHierarchyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Node not found with id: " + id));
    }

    private Integer resolveRootNodeId(MerchandiseHierarchy node) {
        String hierarchyPath = normalizeOptional(node.getHierarchyPath());
        if (hierarchyPath != null) {
            String rootToken = hierarchyPath.contains("/") ? hierarchyPath.substring(0, hierarchyPath.indexOf('/')) : hierarchyPath;
            try {
                return Integer.valueOf(rootToken);
            } catch (NumberFormatException ignored) {
                // Fall back to parent traversal when hierarchy_path is not in expected format.
            }
        }

        MerchandiseHierarchy current = node;
        while (current.getParentId() != null) {
            current = getNodeOrThrow(current.getParentId());
        }
        return current.getId();
    }

    private String resolveRootNodeName(Integer rootId) {
        return merchandiseHierarchyRepository.findById(rootId)
                .map(MerchandiseHierarchy::getNodeName)
                .orElse("Unknown Root");
    }

    private void sortAndCount(List<MerchandiseHierarchyTreeNodeDTO> nodes) {
        nodes.sort(Comparator
                .comparing((MerchandiseHierarchyTreeNodeDTO node) -> safeInt(node.getSortOrder(), 0))
                .thenComparing(node -> String.valueOf(node.getNodeName()).toLowerCase(Locale.ROOT)));
        for (MerchandiseHierarchyTreeNodeDTO node : nodes) {
            sortAndCount(node.getChildren());
            node.setChildCount(node.getChildren().size());
        }
    }

    private int safeInt(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeRequired(String value, String message) {
        String trimmed = normalizeOptional(value);
        if (trimmed == null) {
            throw new RuntimeException(message);
        }
        return trimmed;
    }

    private String resolveUserName(String userName) {
        String trimmed = normalizeOptional(userName);
        return trimmed == null ? "SYSTEM" : trimmed;
    }
}
