// Claude extraction prompts by category

export const EXTRACT_THEATRE = (pageText: string, sourceUrl: string) => `
Voici le contenu scrapé de ${sourceUrl} :

${pageText.slice(0, 12000)}

---

Extrais UNIQUEMENT les spectacles/pièces pour ENFANTS (0-12 ans) actuellement à l'affiche ou programmés les prochaines semaines à Paris.

Pour chaque spectacle trouvé, retourne :
- title: nom du spectacle (PAS le nom du théâtre)
- description: 1-2 phrases
- venue: nom du théâtre/lieu
- arrondissement: "6ème", "4ème", etc.
- age_min: âge minimum
- age_max: âge maximum
- duration: durée approximative
- price: fourchette de prix
- booking_url: URL de réservation (depuis la page scrapée)
- dates: période de représentation
- showtimes: jours et horaires
- tags: ["conte", "marionnettes", "musical", etc.]

Retourne UNIQUEMENT un JSON valide (pas de markdown) : {"shows": [...]}
Maximum 10 spectacles. N'invente rien — n'extrais que ce qui est sur la page.
Si aucun spectacle enfant trouvé, retourne {"shows": []}.`;

export const EXTRACT_EXPO = (pageText: string, sourceUrl: string) => `
Voici le contenu scrapé de ${sourceUrl} :

${pageText.slice(0, 12000)}

---

Extrais UNIQUEMENT les expositions/ateliers pour ENFANTS et FAMILLES actuellement en cours ou à venir à Paris.

Pour chaque expo/atelier trouvé, retourne :
- title: nom de l'exposition ou de l'atelier
- description: 1-2 phrases
- venue: nom du musée/lieu
- arrondissement: "1er", "5ème", etc.
- age_min: âge minimum
- age_max: âge maximum
- duration: durée de visite approximative
- price: fourchette de prix
- booking_url: URL de réservation
- dates: période
- tags: ["sciences", "art", "immersif", "gratuit", etc.]

Retourne UNIQUEMENT un JSON valide : {"expos": [...]}
Maximum 10 items. N'invente rien.
Si rien trouvé, retourne {"expos": []}.`;

export const EXTRACT_ACTIVITE = (pageText: string, sourceUrl: string) => `
Voici le contenu scrapé de ${sourceUrl} :

${pageText.slice(0, 12000)}

---

Extrais UNIQUEMENT les activités/ateliers pour ENFANTS (0-12 ans) disponibles à Paris.

Pour chaque activité trouvée, retourne :
- title: nom de l'activité ou de l'atelier
- description: 1-2 phrases
- venue: nom du lieu
- arrondissement: "3ème", "19ème", etc.
- age_min: âge minimum
- age_max: âge maximum
- duration: durée
- price: tarif
- booking_url: URL de réservation
- dates: disponibilité (permanent, dates spécifiques, etc.)
- tags: ["atelier", "créatif", "sport", "nature", etc.]

Retourne UNIQUEMENT un JSON valide : {"activities": [...]}
Maximum 8 items. N'invente rien.
Si rien trouvé, retourne {"activities": []}.`;

export const EXTRACT_MIXED = (pageText: string, sourceUrl: string) => `
Voici le contenu scrapé de ${sourceUrl} :

${pageText.slice(0, 12000)}

---

Extrais TOUTES les activités pour ENFANTS (0-12 ans) à Paris : spectacles, expos, ateliers, sorties.

Pour chaque item, retourne :
- type: "theatre" | "expo" | "activite"
- title: nom précis
- description: 1-2 phrases
- venue: nom du lieu
- arrondissement: arrondissement parisien
- age_min: âge minimum
- age_max: âge maximum
- duration: durée
- price: tarif
- booking_url: URL de réservation
- dates: période
- showtimes: horaires (si applicable)
- tags: []

Retourne UNIQUEMENT un JSON valide : {"items": [...]}
Maximum 15 items. N'invente rien.
Si rien trouvé, retourne {"items": []}.`;
