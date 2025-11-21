export async function fetchDrugInfo(drugName) {
          if (!drugName || drugName.trim() === '') {
            return null;
          }

          const sanitizedName = encodeURIComponent(drugName.trim().replace(/"/g, ''));

          try {
            // First try general search across all fields (most flexible)
            let url = `https://api.fda.gov/drug/label.json?search=${sanitizedName}&limit=1`;
            let response = await fetch(url);

            let data;
            if (response.ok) {
              data = await response.json();
            } else {
              console.log(`API response not ok for general search: ${response.status}
    ${response.statusText}`);
              return null;
            }

            // If no results, try generic name specifically
            if (!data.results || data.results.length === 0) {
              url =
    `https://api.fda.gov/drug/label.json?search=generic_name:${sanitizedName}&limit=1`;
              response = await fetch(url);

              if (response.ok) {
                data = await response.json();
              } else {
                console.log(`API response not ok for generic: ${response.status}
    ${response.statusText}`);
                return null;
              }
            }

            // If still no results, try brand name
            if (!data.results || data.results.length === 0) {
              url = `https://api.fda.gov/drug/label.json?search=brand_name:${sanitizedName}&limit=1`;
              response = await fetch(url);

              if (response.ok) {
                data = await response.json();
              } else {
                console.log(`API response not ok for brand: ${response.status}
    ${response.statusText}`);
                return null;
              }
            }

            if (data.results && data.results.length > 0) {
              const drug = data.results[0];
              return {
                brandName: drug.openfda?.brand_name ? drug.openfda.brand_name[0] : null,
                genericName: drug.openfda?.generic_name ? drug.openfda.generic_name[0] : null,
                sideEffects: drug.adverse_reactions ? drug.adverse_reactions[0] : null,
                interactions: drug.drug_interactions ? drug.drug_interactions[0] : null,
                warnings: drug.warnings ? drug.warnings[0] : null,
                boxedWarning: drug.boxed_warning ? drug.boxed_warning[0] : null,
                indications: drug.indications_and_usage ? drug.indications_and_usage[0] : null,
                dosage: drug.dosage_and_administration ? drug.dosage_and_administration[0] : null,
                contraindications: drug.contraindications ? drug.contraindications[0] : null,
                precautions: drug.precautions ? drug.precautions[0] : null,
                description: drug.description ? drug.description[0] : null,
                howSupplied: drug.how_supplied ? drug.how_supplied[0] : null,
              };
            } else {
              return null;
            }
          } catch (error) {
            console.error('Error fetching drug info:', error);
            return null;
          }
        }