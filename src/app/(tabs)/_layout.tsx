import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="mapa" options={{ title: 'Mapa' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="mi-recorrido" options={{ title: 'Mi recorrido' }} />
      <Tabs.Screen name="yo" options={{ title: 'Yo' }} />
    </Tabs>
  );
}
