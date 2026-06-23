package MJC.RGSons.service;

import MJC.RGSons.model.LedMaster;
import MJC.RGSons.model.GroupMaster;
import MJC.RGSons.repository.GroupMasterRepository;
import MJC.RGSons.repository.LedMasterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LedMasterService {

    @Autowired
    private LedMasterRepository ledMasterRepository;

    @Autowired
    private GroupMasterRepository groupMasterRepository;

    @Autowired
    private SequenceGeneratorService sequenceGeneratorService;

    public LedMaster create(LedMaster ledMaster) {
        ledMaster.setCode(sequenceGeneratorService.generateSequence("Master_SEQ"));

        if (ledMaster.getName() != null) {
            ledMaster.setName(ledMaster.getName().trim());
        }
        if (ledMaster.getGroupCode() != null) {
            ledMaster.setGroupCode(ledMaster.getGroupCode().trim());
        }

        if (ledMaster.getName() == null || ledMaster.getName().isBlank()) {
            throw new RuntimeException("Ledger name is required");
        }
        if (ledMaster.getGroupCode() == null || ledMaster.getGroupCode().isBlank()) {
            throw new RuntimeException("Group code is required");
        }

        if (ledMasterRepository.existsByNameIgnoreCase(ledMaster.getName())) {
            throw new RuntimeException("Ledger name already exists: " + ledMaster.getName());
        }

        if (ledMaster.getStatus() == null) {
            ledMaster.setStatus(true);
        }

        if (ledMaster.getCreatedAt() == null) {
            ledMaster.setCreatedAt(LocalDateTime.now());
        }
        ledMaster.setUpdateAt(LocalDateTime.now());

        LedMaster saved = ledMasterRepository.save(ledMaster);
        enrichGroupName(saved);
        return saved;
    }

    public List<LedMaster> getAll() {
        List<LedMaster> list = ledMasterRepository.findAll();
        enrichGroupNames(list);
        return list;
    }

    public List<LedMaster> getActiveByGroupNames(List<String> groupNames) {
        if (groupNames == null || groupNames.isEmpty()) return java.util.Collections.emptyList();

        Set<String> wantedNames = groupNames.stream()
                .map(s -> String.valueOf(s == null ? "" : s).trim())
                .filter(s -> !s.isBlank())
                .map(String::toLowerCase)
                .collect(Collectors.toSet());

        if (wantedNames.isEmpty()) return java.util.Collections.emptyList();

        Set<String> groupCodes = groupMasterRepository.findAll().stream()
                .filter(g -> g != null && g.getName() != null && g.getCode() != null)
                .filter(g -> wantedNames.contains(g.getName().trim().toLowerCase()))
                .map(GroupMaster::getCode)
                .collect(Collectors.toSet());

        wantedNames.stream()
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .filter(s -> s.length() <= 10)
                .forEach(groupCodes::add);

        if (groupCodes.isEmpty()) return java.util.Collections.emptyList();
        List<LedMaster> list = ledMasterRepository.findByGroupCodeIn(new ArrayList<>(groupCodes)).stream()
                .filter(l -> l != null)
                .filter(l -> l.getStatus() == null || Boolean.TRUE.equals(l.getStatus()))
                .toList();
        enrichGroupNames(list);
        return list;
    }

    public Optional<LedMaster> getById(Integer id) {
        Optional<LedMaster> ledMaster = ledMasterRepository.findById(id);
        ledMaster.ifPresent(this::enrichGroupName);
        return ledMaster;
    }

    public LedMaster update(Integer id, LedMaster details) {
        LedMaster existing = ledMasterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ledger master not found with id: " + id));

        if (details.getName() != null) {
            details.setName(details.getName().trim());
        }
        if (details.getGroupCode() != null) {
            details.setGroupCode(details.getGroupCode().trim());
        }

        if (details.getName() == null || details.getName().isBlank()) {
            throw new RuntimeException("Ledger name is required");
        }
        if (details.getGroupCode() == null || details.getGroupCode().isBlank()) {
            throw new RuntimeException("Group code is required");
        }

        if (details.getName() != null &&
                !existing.getName().equalsIgnoreCase(details.getName()) &&
                ledMasterRepository.existsByNameIgnoreCase(details.getName())) {
            throw new RuntimeException("Ledger name already exists: " + details.getName());
        }

        existing.setName(details.getName());
        existing.setGroupCode(details.getGroupCode());
        existing.setAddress(details.getAddress());
        existing.setCity(details.getCity());
        existing.setState(details.getState());
        existing.setDistrict(details.getDistrict());
        existing.setPin(details.getPin());
        existing.setPhone(details.getPhone());
        existing.setEmail(details.getEmail());
        existing.setPan(details.getPan());
        existing.setGstNumber(details.getGstNumber());
        existing.setVatNo(details.getVatNo());
        existing.setType(details.getType());
        existing.setStatus(details.getStatus() == null ? existing.getStatus() : details.getStatus());
        existing.setUpdateAt(LocalDateTime.now());

        LedMaster saved = ledMasterRepository.save(existing);
        enrichGroupName(saved);
        return saved;
    }

    public void delete(Integer id) {
        LedMaster existing = ledMasterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ledger master not found with id: " + id));

        try {
            ledMasterRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            existing.setStatus(false);
            existing.setUpdateAt(LocalDateTime.now());
            ledMasterRepository.save(existing);
        }
    }

    public boolean codeExists(String code) {
        return ledMasterRepository.findByCode(code) != null;
    }

    private void enrichGroupName(LedMaster ledMaster) {
        if (ledMaster == null) return;
        String groupCode = ledMaster.getGroupCode();
        if (groupCode == null || groupCode.isBlank()) {
            ledMaster.setGroupName(null);
            return;
        }
        GroupMaster group = groupMasterRepository.findByCode(groupCode.trim());
        ledMaster.setGroupName(group != null ? group.getName() : null);
    }

    private void enrichGroupNames(List<LedMaster> ledMasters) {
        if (ledMasters == null || ledMasters.isEmpty()) return;
        Map<String, String> groupNamesByCode = new HashMap<>();
        for (GroupMaster group : groupMasterRepository.findAll()) {
            if (group == null || group.getCode() == null) continue;
            groupNamesByCode.put(group.getCode().trim(), group.getName());
        }
        for (LedMaster ledMaster : ledMasters) {
            if (ledMaster == null) continue;
            String groupCode = ledMaster.getGroupCode();
            ledMaster.setGroupName(
                    groupCode == null || groupCode.isBlank()
                            ? null
                            : groupNamesByCode.get(groupCode.trim())
            );
        }
    }
}
