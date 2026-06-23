package MJC.RGSons.service;

import MJC.RGSons.model.GroupMaster;
import MJC.RGSons.repository.GroupMasterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class GroupMasterService {

    @Autowired
    private GroupMasterRepository groupMasterRepository;

    @Autowired
    private SequenceGeneratorService sequenceGeneratorService;

    public GroupMaster create(GroupMaster groupMaster) {
        groupMaster.setCode(sequenceGeneratorService.generateSequence("Master_SEQ"));

        if (groupMaster.getName() != null) {
            groupMaster.setName(groupMaster.getName().trim());
        }
        if (groupMaster.getGroupCode() != null) {
            groupMaster.setGroupCode(groupMaster.getGroupCode().trim());
        }

        if (groupMaster.getName() == null || groupMaster.getName().isBlank()) {
            throw new RuntimeException("Group name is required");
        }

        if (groupMasterRepository.existsByNameIgnoreCase(groupMaster.getName())) {
            throw new RuntimeException("Group name already exists: " + groupMaster.getName());
        }

        if (groupMaster.getStatus() == null) {
            groupMaster.setStatus(true);
        }

        if (groupMaster.getCreatedAt() == null) {
            groupMaster.setCreatedAt(LocalDateTime.now());
        }
        groupMaster.setUpdateAt(LocalDateTime.now());

        return groupMasterRepository.save(groupMaster);
    }

    public List<GroupMaster> getAll() {
        return groupMasterRepository.findAll();
    }

    public Optional<GroupMaster> getById(Integer id) {
        return groupMasterRepository.findById(id);
    }

    public GroupMaster update(Integer id, GroupMaster details) {
        GroupMaster existing = groupMasterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Accounting group not found with id: " + id));

        if (details.getName() != null) {
            details.setName(details.getName().trim());
        }
        if (details.getGroupCode() != null) {
            details.setGroupCode(details.getGroupCode().trim());
        }

        if (details.getName() == null || details.getName().isBlank()) {
            throw new RuntimeException("Group name is required");
        }

        if (!existing.getName().equalsIgnoreCase(details.getName()) &&
                groupMasterRepository.existsByNameIgnoreCase(details.getName())) {
            throw new RuntimeException("Group name already exists: " + details.getName());
        }

        existing.setName(details.getName());
        existing.setGroupCode(details.getGroupCode());
        existing.setStatus(details.getStatus() == null ? existing.getStatus() : details.getStatus());
        existing.setUpdateAt(LocalDateTime.now());

        return groupMasterRepository.save(existing);
    }

    public void delete(Integer id) {
        GroupMaster existing = groupMasterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Accounting group not found with id: " + id));

        try {
            groupMasterRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            existing.setStatus(false);
            existing.setUpdateAt(LocalDateTime.now());
            groupMasterRepository.save(existing);
        }
    }

    public boolean codeExists(String code) {
        return groupMasterRepository.findByCode(code) != null;
    }
}
