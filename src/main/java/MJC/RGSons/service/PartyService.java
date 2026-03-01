package MJC.RGSons.service;

import MJC.RGSons.model.Party;
import MJC.RGSons.repository.PartyRepository;
import MJC.RGSons.repository.PurHeadRepository;
import MJC.RGSons.repository.TranHeadRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PartyService {

    @Autowired
    private PartyRepository partyRepository;

    @Autowired
    private SequenceGeneratorService sequenceGeneratorService;

    @Autowired
    private PurHeadRepository purHeadRepository;

    @Autowired
    private TranHeadRepository tranHeadRepository;

    // Create a new party
    public Party createParty(Party party) {
        // Generate Party Code from Sequence
        party.setCode(sequenceGeneratorService.generateSequence("Master_SEQ"));

        // Trim name
        if (party.getName() != null) {
            party.setName(party.getName().trim());
        }

        // Check if party code already exists (should not happen with sequence but good to keep as safeguard or remove)
        /*
        if (partyRepository.findByCode(party.getCode()) != null) {
            throw new RuntimeException("Party code already exists: " + party.getCode());
        }
        */

        // Check if party name already exists
        if (partyRepository.existsByNameIgnoreCase(party.getName())) {
            throw new RuntimeException("Party name already exists: " + party.getName());
        }
        
        // Ensure status is set
        if (party.getStatus() == null) {
            party.setStatus(true);
        }
        
        return partyRepository.save(party);
    }

    // Get all parties
    public List<Party> getAllParties() {
        return partyRepository.findAll();
    }

    // Get parties by type
    public List<Party> getPartiesByType(String type) {
        return partyRepository.findByType(type);
    }

    // Get party by ID
    public Optional<Party> getPartyById(Integer id) {
        return partyRepository.findById(id);
    }

    // Get party by code
    public Party getPartyByCode(String code) {
        return partyRepository.findByCode(code);
    }

    // Update party
    public Party updateParty(Integer id, Party partyDetails) {
        Optional<Party> optionalParty = partyRepository.findById(id);
        if (optionalParty.isPresent()) {
            Party existingParty = optionalParty.get();

            // Trim name
            if (partyDetails.getName() != null) {
                partyDetails.setName(partyDetails.getName().trim());
            }

            // Check if party code is being changed and if it already exists
            /*
            if (!existingParty.getCode().equals(partyDetails.getCode())) {
                Party partyWithCode = partyRepository.findByCode(partyDetails.getCode());
                if (partyWithCode != null) {
                    throw new RuntimeException("Party code already exists: " + partyDetails.getCode());
                }
            }
            */

            // Check if name is changing and unique
            if (!existingParty.getName().equalsIgnoreCase(partyDetails.getName()) &&
                partyRepository.existsByNameIgnoreCase(partyDetails.getName())) {
                throw new RuntimeException("Party name already exists: " + partyDetails.getName());
            }

            // Update fields
            // existingParty.setCode(partyDetails.getCode()); // Code is non-editable
            existingParty.setName(partyDetails.getName());
            existingParty.setAddress(partyDetails.getAddress());
            existingParty.setCity(partyDetails.getCity());
            existingParty.setState(partyDetails.getState());
            existingParty.setDistrict(partyDetails.getDistrict());
            existingParty.setPin(partyDetails.getPin());
            existingParty.setPhone(partyDetails.getPhone());
            existingParty.setEmail(partyDetails.getEmail());
            existingParty.setPan(partyDetails.getPan());
            existingParty.setGstNumber(partyDetails.getGstNumber());
            existingParty.setVatNo(partyDetails.getVatNo());
            existingParty.setType(partyDetails.getType());
            existingParty.setStatus(partyDetails.getStatus());
            existingParty.setUpdateAt(LocalDateTime.now());

            return partyRepository.save(existingParty);
        } else {
            throw new RuntimeException("Party not found with id: " + id);
        }
    }

    // Delete party
    public void deleteParty(Integer id) {
        Optional<Party> optionalParty = partyRepository.findById(id);
        if (optionalParty.isPresent()) {
            Party party = optionalParty.get();
            String partyCode = party.getCode();
            
            // Check if used in PurHead or TranHead
            boolean isUsed = false;
            if (purHeadRepository.existsByPartyCode(partyCode)) {
                isUsed = true;
            } else if (tranHeadRepository.existsByPartyCode(partyCode)) {
                isUsed = true;
            }
            
            if (isUsed) {
                // Mark as inactive (soft delete)
                party.setStatus(false);
                party.setUpdateAt(LocalDateTime.now());
                partyRepository.save(party);
            } else {
                // Hard delete
                try {
                    partyRepository.deleteById(id);
                } catch (Exception e) {
                    // Fallback to soft delete if constraints fail
                    party.setStatus(false);
                    party.setUpdateAt(LocalDateTime.now());
                    partyRepository.save(party);
                }
            }
        } else {
            throw new RuntimeException("Party not found with id: " + id);
        }
    }

    // Check if party code exists
    public boolean partyCodeExists(String code) {
        return partyRepository.findByCode(code) != null;
    }
}
