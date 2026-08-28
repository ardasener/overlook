use std::collections::BTreeMap;

use fontdb::Database;
use serde::Serialize;

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FontFamily {
    pub name: String,
    pub monospaced: bool,
}

#[derive(Clone)]
struct TestFace {
    family: String,
    monospaced: bool,
}

impl TestFace {
    #[cfg(test)]
    fn new(family: &str, monospaced: bool) -> Self {
        Self { family: family.into(), monospaced }
    }
}

fn families_from_faces<I>(faces: I) -> Vec<FontFamily>
where
    I: IntoIterator<Item = TestFace>,
{
    let mut families = BTreeMap::<String, bool>::new();
    for face in faces {
        let name = face.family.trim();
        if name.is_empty() {
            continue;
        }
        families
            .entry(name.to_string())
            .and_modify(|monospaced| *monospaced |= face.monospaced)
            .or_insert(face.monospaced);
    }
    families
        .into_iter()
        .map(|(name, monospaced)| FontFamily { name, monospaced })
        .collect()
}

#[tauri::command]
pub fn font_list() -> Vec<FontFamily> {
    let mut database = Database::new();
    database.load_system_fonts();
    families_from_faces(database.faces().flat_map(|face| {
        let monospaced = face.monospaced;
        face.families.iter().map(move |(family, _)| TestFace {
            family: family.clone(),
            monospaced,
        })
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deduplicates_family_names_and_aggregates_monospaced_faces() {
        let faces = vec![
            TestFace::new("Inter", false),
            TestFace::new("Fira Code", true),
            TestFace::new("Fira Code", false),
            TestFace::new("Inter", false),
        ];

        assert_eq!(families_from_faces(faces), vec![
            FontFamily { name: "Fira Code".into(), monospaced: true },
            FontFamily { name: "Inter".into(), monospaced: false },
        ]);
    }

    #[test]
    fn ignores_empty_family_names() {
        assert!(families_from_faces(vec![TestFace::new("", false)]).is_empty());
    }
}
