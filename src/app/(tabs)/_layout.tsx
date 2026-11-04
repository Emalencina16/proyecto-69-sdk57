import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import colores from '@/tema/colores';

function icono(name: SymbolViewProps['name']) {
  return ({ color }: { color: ColorValue }) => <SymbolView name={name} tintColor={color} size={24} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores['texto-suave'],
        tabBarStyle: { backgroundColor: colores.superficie, borderTopColor: colores.borde },
        headerStyle: { backgroundColor: colores.superficie },
        headerTintColor: colores.texto,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Tabs.Screen
        name="mapa"
        options={{ title: 'Mapa', tabBarIcon: icono({ ios: 'map', android: 'map', web: 'map' }) }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: icono({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }),
        }}
      />
      <Tabs.Screen
        name="mi-recorrido"
        options={{
          title: 'Mi recorrido',
          tabBarIcon: icono({ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' }),
        }}
      />
      <Tabs.Screen
        name="yo"
        options={{
          title: 'Yo',
          tabBarIcon: icono({ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }),
        }}
      />
    </Tabs>
  );
}
